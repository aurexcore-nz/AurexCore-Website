import logging
import html

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import msal
import requests

logger = logging.getLogger(__name__)


class GraphMailError(Exception):
    pass


def _get_graph_access_token() -> str:
    authority = f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}"
    app = msal.ConfidentialClientApplication(
        client_id=settings.GRAPH_CLIENT_ID,
        authority=authority,
        client_credential=settings.GRAPH_CLIENT_SECRET,
    )
    token_result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )
    if "access_token" not in token_result:
        error_description = token_result.get(
            "error_description",
            "Unable to acquire Microsoft Graph token.",
        )
        logger.error("Microsoft Graph token error: %s", error_description)
        raise GraphMailError(error_description)
    return token_result["access_token"]


def send_contact_form_email(enquiry) -> None:
    safe_name = html.escape(enquiry.full_name or "")
    safe_email = html.escape(enquiry.email or "")
    safe_phone = html.escape(enquiry.phone or "Not provided")
    safe_company = html.escape(enquiry.company or "Not provided")
    safe_topic = html.escape(enquiry.help_topic or "")
    safe_contact_method = html.escape(enquiry.contact_method or "")
    safe_message = html.escape(enquiry.message or "").replace("\n", "<br>")

    email_subject = f"Website Enquiry: {enquiry.help_topic or 'New enquiry'}"

    plain_body = (
        f"New website enquiry received.\n\n"
        f"Name: {enquiry.full_name}\n"
        f"Company: {enquiry.company}\n"
        f"Email: {enquiry.email}\n"
        f"Phone: {enquiry.phone or 'Not provided'}\n"
        f"Help Topic: {enquiry.help_topic}\n"
        f"Contact Method: {enquiry.contact_method}\n\n"
        f"Message:\n{enquiry.message}"
    )

    html_body = f"""
    <h2>New website enquiry received</h2>
    <p><strong>Name:</strong> {safe_name}</p>
    <p><strong>Company:</strong> {safe_company}</p>
    <p><strong>Email:</strong> {safe_email}</p>
    <p><strong>Phone:</strong> {safe_phone}</p>
    <p><strong>Help Topic:</strong> {safe_topic}</p>
    <p><strong>Contact Method:</strong> {safe_contact_method}</p>
    <hr>
    <p><strong>Message:</strong></p>
    <p>{safe_message}</p>
    """

    if not settings.USE_GRAPH_EMAIL:
        email = EmailMultiAlternatives(
            subject=email_subject,
            body=plain_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.CONTACT_FORM_TO_EMAIL],
            reply_to=[enquiry.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)
        return

    access_token = _get_graph_access_token()
    endpoint = (
        f"https://graph.microsoft.com/v1.0/users/"
        f"{settings.GRAPH_SENDER_EMAIL}/sendMail"
    )
    payload = {
        "message": {
            "subject": email_subject,
            "body": {
                "contentType": "HTML",
                "content": html_body,
            },
            "toRecipients": [
                {"emailAddress": {"address": settings.CONTACT_FORM_TO_EMAIL}}
            ],
            "replyTo": [
                {"emailAddress": {"address": enquiry.email, "name": enquiry.full_name}}
            ],
        },
        "saveToSentItems": settings.GRAPH_SAVE_TO_SENT,
    }
    response = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=20,
    )
    if response.status_code not in (200, 202):
        logger.error(
            "Microsoft Graph sendMail failed. Status: %s, Response: %s",
            response.status_code,
            response.text,
        )
        raise GraphMailError(
            f"Microsoft Graph sendMail failed with status {response.status_code}."
        )
