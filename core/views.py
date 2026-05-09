from django.shortcuts import render, redirect, get_object_or_404
from django.utils.html import mark_safe

from .models import Enquiry, InsightPost
from .forms import EnquiryForm
from django.core.mail import send_mail
from django.conf import settings


# ── Shared content data ────────────────────────────────────────────────────

WHY_POINTS = [
    {'title': 'Strategy and execution together',
     'body': 'We connect planning and delivery across infrastructure, security, data, automation, and workplace systems.'},
    {'title': 'Built around real operations',
     'body': 'Our solutions are designed for how businesses actually run day to day.'},
    {'title': 'Focused on outcomes, not tools',
     'body': 'We prioritise visibility, efficiency, resilience, and control over technology for its own sake.'},
    {'title': 'Designed for long-term scale',
     'body': 'Every environment is shaped to support future growth and increasing capability.'},
]

PROCESS_STEPS = [
    {'title': 'Assess',    'body': 'Understand the current environment, operational pressure points, risks, and priorities.'},
    {'title': 'Design',    'body': 'Define the right architecture, scope, roadmap, and implementation sequence.'},
    {'title': 'Implement', 'body': 'Deliver systems, integrations, controls, and practical change across the environment.'},
    {'title': 'Optimise',  'body': 'Refine, support, secure, and improve the environment as the business evolves.'},
]

INDUSTRIES = [
    {'name': 'Professional Services',
     'body': 'Support secure collaboration, modern workplace systems, reliable infrastructure, and better operational visibility.'},
    {'name': 'Construction and Field Operations',
     'body': 'Support mobile teams with better connectivity, device management, secure access, and simplified reporting workflows.'},
    {'name': 'Security and Monitoring Environments',
     'body': 'Support time-sensitive operations with resilient systems, visibility, system integration, and continuity-focused design.'},
    {'name': 'Retail and POS Environments',
     'body': 'Improve uptime, device consistency, supportability, and operational control across customer-facing environments.'},
    {'name': 'Multi-site Operations',
     'body': 'Create more consistent systems, stronger governance, and better visibility across distributed locations.'},
    {'name': 'Growth-stage Businesses',
     'body': 'Build the right technology foundation early so systems, controls, workflows, and reporting can scale with the business.'},
]

INSIGHT_TOPICS = [
    'What AI readiness actually looks like for New Zealand businesses',
    'When automation should come before new software',
    'Why backup alone is not business continuity',
    'Signs your infrastructure is holding back growth',
    'How to reduce operational friction across teams and systems',
    'What a modern Microsoft 365 environment should include',
    'How to think about security in a hybrid operating environment',
    'When a business has outgrown reactive IT support',
]

PLACEHOLDER_INSIGHTS = [
    {'category': 'AI & Automation',
     'title': 'What AI readiness actually looks like for New Zealand businesses',
     'excerpt': 'Most businesses are not ready for AI — but not for the reasons they think. We explore the practical foundations needed before automation can deliver real value.'},
    {'category': 'Strategy',
     'title': 'When a business has outgrown reactive IT support',
     'excerpt': 'The signs are often subtle at first. Systems slow down, processes multiply, and IT decisions become reactive. Here is how to recognise the inflection point.'},
    {'category': 'Cybersecurity',
     'title': 'Why backup alone is not business continuity',
     'excerpt': 'Having a backup is not the same as being able to recover. We explain the difference and what a real continuity posture looks like.'},
]

TEAM_MEMBERS = [
    {'name': 'Ravi Shah', 'role': 'Managing Director', 'photo': '',
     'bio': 'Ravi leads Aurex Core with responsibility across commercial direction, client engagement, and service delivery alignment. With over 15 years of experience in operations and account management, he ensures delivery remains structured, consistent, and aligned with client requirements.'},
    {'name': 'Devang Rupani', 'role': 'Head of Technical & Service Delivery', 'photo': '',
     'bio': 'Devang leads technical delivery and field execution across Aurex Core. With over 15 years of experience, he oversees the implementation of infrastructure environments, ensuring consistent delivery standards and alignment with operational requirements.'},
    {'name': 'Prabhu Srinivasan', 'role': 'Commercial Lead — South Island', 'photo': '',
     'bio': 'Prabhu leads commercial activities across the South Island, with responsibility for client engagement, regional coordination, and maintaining alignment between service delivery and commercial expectations.'},
]

BELIEFS = [
    {'title': 'What we believe',
     'body': 'Technology should do more than keep systems running. It should reduce friction, improve control, strengthen resilience, and create better conditions for growth.'},
    {'title': 'How we think',
     'body': 'Cloud, infrastructure, cybersecurity, devices, data, and automation should not be planned in isolation. The strongest environments are designed as connected systems with clear operational intent.'},
    {'title': 'What makes Aurex Core different',
     'body': 'Our focus is not simply support. It is helping businesses build more capable operating environments through practical technology design, structured implementation, and a clear path toward intelligent automation.'},
    {'title': 'How we work with clients',
     'body': 'We work with businesses that want more than a quick fix. We help define the right next step, deliver practical solutions, and create technology environments that can scale with the business over time.'},
]

AI_CAPABILITIES = [
    {'title': 'Data engineering',
     'body': 'Build structured data pipelines for collection, transformation, integration, and reporting.'},
    {'title': 'Data integrity and governance',
     'body': 'Improve data quality, consistency, traceability, and confidence across systems and workflows.'},
    {'title': 'Predictive analytics and forecasting',
     'body': 'Use historical and operational data to support planning, trend analysis, exception detection, and forecasting.'},
    {'title': 'Machine learning models',
     'body': 'Implement practical models for anomaly detection, classification, monitoring, and targeted insight generation where commercially relevant.'},
    {'title': 'Real-time dashboards',
     'body': 'Bring operational metrics, alerts, and performance signals into one place for faster decision-making.'},
    {'title': 'Workflow automation',
     'body': 'Reduce repetitive administration through rules-based logic, notifications, approvals, validation, escalations, and automated task routing.'},
    {'title': 'AI strategy and implementation',
     'body': 'Define practical use cases, business priorities, governance considerations, and implementation pathways for responsible adoption.'},
]

CLOUD_CAPABILITIES = [
    {'title': 'Cloud platforms',           'body': 'Support across Microsoft Azure, AWS, and Google Cloud.'},
    {'title': 'Hybrid infrastructure',     'body': 'Integrate cloud and on-premise environments for flexibility, performance, and staged transformation.'},
    {'title': 'Server, storage, and virtualisation', 'body': 'Design and support core systems for compute, storage, performance, and availability.'},
    {'title': 'Data platform architecture','body': 'Create foundation layers for structured data storage, processing, and reporting.'},
    {'title': 'High availability and fault tolerance','body': 'Reduce single points of failure and improve service continuity.'},
    {'title': 'Disaster recovery environments','body': 'Support recovery planning and implementation across cloud and infrastructure platforms.'},
]

SECURITY_CAPABILITIES = [
    {'title': 'Security and compliance frameworks','body': 'Support clearer structure, controls, and accountability across the environment.'},
    {'title': 'Endpoint protection',       'body': 'Protect end-user devices through modern endpoint security platforms.'},
    {'title': 'Firewall solutions',        'body': 'Design and implement secure perimeter and traffic control environments.'},
    {'title': 'Backup platforms',          'body': 'Support data protection, recovery confidence, and operational resilience.'},
    {'title': 'Disaster recovery capability','body': 'Improve preparedness for system failure, outage, or broader business disruption.'},
    {'title': 'Continuity-oriented design','body': 'Build environments that support continuity, not just day-to-day uptime.'},
]

WORKPLACE_CAPABILITIES = [
    {'title': 'Microsoft 365 solutions',  'body': 'Deployment, optimisation, administration, and environment improvement.'},
    {'title': 'Email migration to Microsoft 365','body': 'Smooth migration planning and implementation for better continuity and usability.'},
    {'title': 'Email and email security solutions','body': 'Improve protection, structure, and user confidence in day-to-day communication.'},
    {'title': 'Workflow integration',     'body': 'Connect systems and workplace tools to reduce duplication and manual handling.'},
    {'title': 'User environment standardisation','body': 'Support more consistent device, user, and access experiences.'},
]

NETWORKING_CAPABILITIES = [
    {'title': 'Network solutions',        'body': 'Support secure and reliable business connectivity.'},
    {'title': 'Wi-Fi solutions',           'body': 'Improve wireless performance, coverage, and user experience.'},
    {'title': 'Desktop and laptop lifecycle management','body': 'Support provisioning, standardisation, hardening, and support readiness.'},
    {'title': 'POS systems deployment and integration','body': 'Support customer-facing environments that depend on consistent device performance.'},
    {'title': 'Printing and managed print environments','body': 'Improve usability, consistency, and supportability where required.'},
    {'title': 'Structured cabling and labelling','body': 'Support cleaner physical environments and better operational organisation.'},
    {'title': 'Ethernet termination and fibre splicing','body': 'Support connectivity execution where specialist delivery is required.'},
    {'title': 'UPS and power resilience', 'body': 'Support critical uptime through better power protection planning.'},
]


def _svg(path_d):
    return mark_safe(f'<svg class="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="{path_d}"/></svg>')


# ── Views ──────────────────────────────────────────────────────────────────

HERO_PILLARS = [
    'Infrastructure & Cloud',
    'Cybersecurity & Continuity',
    'AI & Automation',
    'Modern Workplace',
]

HERO_DOMAINS = [
    {'title': 'Infrastructure',      'sub': 'Cloud & on-premise'},
    {'title': 'Security',            'sub': 'Protect & recover'},
    {'title': 'Automation & Data',   'sub': 'Intelligent workflows'},
    {'title': 'Workplace & Devices', 'sub': 'M365 & endpoints'},
]

HERO_METRICS = [
    {'value': '15+', 'label': 'Years experience'},
    {'value': '7',   'label': 'NZ locations'},
    {'value': '12+', 'label': 'Tech partners'},
]

STATS = [
    {'value': 15,  'suffix': '+', 'label': 'Years of combined experience'},
    {'value': 7,   'suffix': '',  'label': 'Cities across New Zealand'},
    {'value': 12,  'suffix': '+', 'label': 'Technology partner brands'},
    {'value': 100, 'suffix': '%', 'label': 'NZ-based delivery team'},
]

DELIVERY_MODEL = [
    {'title': 'Nationwide reach',         'body': 'Active delivery across Auckland, Hamilton, Tauranga, Wellington, Nelson, Christchurch, and Queenstown.'},
    {'title': 'On-site and remote',       'body': 'Flexible delivery combining physical presence with remote management and support capability.'},
    {'title': 'Structured engagement',    'body': 'Defined scope, clear milestones, and accountable delivery — not open-ended retainers.'},
    {'title': 'Partner-aligned delivery', 'body': 'Working with local and national channel partners to ensure coverage, continuity, and consistency.'},
]

ENGAGEMENT_MODELS = [
    {
        'title': 'Direct Delivery',
        'body': 'We engage directly with end clients to assess, design, and implement technology environments. Full accountability from initial assessment to ongoing optimisation.',
    },
    {
        'title': 'Partner-Aligned',
        'body': 'We work alongside existing technology partners, MSPs, and resellers to extend their delivery capacity with specialist execution and technical depth.',
    },
    {
        'title': 'Subcontract & White-Label',
        'body': 'We operate as a white-label or subcontract delivery partner for organisations that require trusted, high-quality technical execution without brand exposure.',
    },
]

TECH_PARTNERS = [
    {'name': 'Dell',          'slug': 'dell'},
    {'name': 'HPE',           'slug': 'hpe'},
    {'name': 'Lenovo',        'slug': 'lenovo'},
    {'name': 'IBM',           'slug': 'ibm'},
    {'name': 'Cisco',         'slug': 'cisco'},
    {'name': 'Teltonika',     'slug': 'teltonika'},
    {'name': 'Fortinet',      'slug': 'fortinet'},
    {'name': 'Sophos',        'slug': 'sophos'},
    {'name': 'VMware',        'slug': 'vmware'},
    {'name': 'Acronis',       'slug': 'acronis'},
    {'name': 'APC',           'slug': 'apc'},
    {'name': 'CrowdStrike',   'slug': 'crowdstrike'},
    {'name': 'Malwarebytes',  'slug': 'malwarebytes'},
    {'name': 'Microsoft',     'slug': 'microsoft'},
    {'name': 'SonicWall',     'slug': 'sonicwall'},
    {'name': 'Veeam',         'slug': 'veeam'},
]

import json as _json

def home(request):
    posts = InsightPost.objects.filter(published=True)[:3]
    stats_js = _json.dumps([
        {'target': s['value'], 'suffix': s['suffix'], 'label': s['label']}
        for s in STATS
    ])
    return render(request, 'core/home.html', {
        'why_points':           WHY_POINTS,
        'process_steps':        PROCESS_STEPS,
        'industries':           [i['name'] for i in INDUSTRIES],
        'recent_insights':      posts,
        'placeholder_insights': PLACEHOLDER_INSIGHTS,
        'hero_pillars':         HERO_PILLARS,
        'hero_domains':         HERO_DOMAINS,
        'hero_metrics':         HERO_METRICS,
        'stats':                STATS,
        'stats_js':             stats_js,
        'delivery_model':       DELIVERY_MODEL,
        'engagement_models':    ENGAGEMENT_MODELS,
        'tech_partners':        TECH_PARTNERS,
    })


def solutions(request):
    items = [
        {
            'title': 'AI and Intelligent Automation',
            'body': 'Use structured data, automation, and intelligent workflows to reduce friction and support smarter decisions.',
            'url': '/ai-intelligent-automation/',
            'outcomes': ['Improved operational visibility', 'Reduced manual handling', 'Faster internal processes', 'Stronger decision support'],
            'icon_html': _svg('M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.319 2.51l-2.633-.527'),
        },
        {
            'title': 'Cloud, Infrastructure and Platform Engineering',
            'body': 'Build scalable, stable environments across cloud, hybrid, and on-premise systems.',
            'url': '/cloud-infrastructure-platform-engineering/',
            'outcomes': ['More stable infrastructure', 'Better scalability', 'Improved resilience', 'Stronger service continuity'],
            'icon_html': _svg('M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z'),
        },
        {
            'title': 'Cybersecurity, Backup and Business Continuity',
            'body': 'Strengthen protection, resilience, and recovery readiness across the business environment.',
            'url': '/cybersecurity-backup-business-continuity/',
            'outcomes': ['Reduced operational risk', 'Stronger resilience', 'Better recovery confidence', 'Improved continuity posture'],
            'icon_html': _svg('M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'),
        },
        {
            'title': 'Modern Workplace and Business Applications',
            'body': 'Improve collaboration, security, and consistency across user systems and tools.',
            'url': '/modern-workplace-business-applications/',
            'outcomes': ['More productive teams', 'Better user consistency', 'Reduced administrative friction', 'More secure communication'],
            'icon_html': _svg('M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3'),
        },
        {
            'title': 'Networking, Devices and Physical Infrastructure',
            'body': 'Support reliable day-to-day operations through strong connectivity, managed devices, and properly executed physical technology layers.',
            'url': '/networking-devices-physical-infrastructure/',
            'outcomes': ['More reliable daily operations', 'Better connectivity', 'Improved device consistency', 'Stronger operating foundation'],
            'icon_html': _svg('M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z'),
        },
    ]
    return render(request, 'core/solutions.html', {'solutions': items})


def ai_automation(request):
    return render(request, 'core/ai_automation.html', {
        'capabilities': AI_CAPABILITIES,
        'outcomes': ['Improved operational visibility','Reduced manual handling','Faster internal processes','Better exception management','More consistent reporting','Stronger decision support','Better foundation for future automation'],
    })


def cloud_infrastructure(request):
    return render(request, 'core/cloud_infrastructure.html', {
        'capabilities': CLOUD_CAPABILITIES,
        'outcomes': ['More stable infrastructure','Better scalability','Improved resilience','Stronger service continuity','Better platform governance','More confidence for future growth'],
    })


def cybersecurity(request):
    return render(request, 'core/cybersecurity.html', {
        'capabilities': SECURITY_CAPABILITIES,
        'outcomes': ['Reduced operational risk','Stronger resilience','Better recovery confidence','Improved continuity posture','Better control over exposure','More defensible operational protection'],
    })


def modern_workplace(request):
    return render(request, 'core/modern_workplace.html', {
        'capabilities': WORKPLACE_CAPABILITIES,
        'outcomes': ['More productive teams','Better user consistency','Reduced administrative friction','More secure communication','Better day-to-day collaboration','Cleaner workplace technology setup'],
    })


def networking(request):
    return render(request, 'core/networking.html', {
        'capabilities': NETWORKING_CAPABILITIES,
        'outcomes': ['More reliable day-to-day operations','Better connectivity','Improved device consistency','Cleaner physical execution','Better supportability','Stronger operating foundation'],
    })


def industries(request):
    return render(request, 'core/industries.html', {'industries': INDUSTRIES})


def about(request):
    return render(request, 'core/about.html', {
        'beliefs':      BELIEFS,
        'team_members': TEAM_MEMBERS,
    })


def insights(request):
    posts = InsightPost.objects.filter(published=True)
    return render(request, 'core/insights.html', {
        'posts':          posts,
        'insight_topics': INSIGHT_TOPICS,
    })


def insight_detail(request, slug):
    post = get_object_or_404(InsightPost, slug=slug, published=True)
    return render(request, 'core/insight_detail.html', {'post': post})


def contact(request):
    form = EnquiryForm()
    form_success = False
    form_error = False

    if request.method == 'POST':
        if request.POST.get('website'):           # honeypot
            return redirect('contact')
        form = EnquiryForm(request.POST)
        if form.is_valid():
            try:
                enquiry = form.save()  # Save to DB
                # Send email
                send_mail(
                    subject='New Enquiry from Aurex Core Website',
                    message=(
                        f"Name: {enquiry.full_name}\n"
                        f"Company: {enquiry.company}\n"
                        f"Email: {enquiry.email}\n"
                        f"Phone: {enquiry.phone}\n"
                        f"Help Topic: {enquiry.help_topic}\n"
                        f"Contact Method: {enquiry.contact_method}\n"
                        f"Message: {enquiry.message}\n"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['hello@aurexcore.nz'],
                    fail_silently=False,
                )
                form_success = True
                form = EnquiryForm()
            except Exception as e:
                form_error = True
                form = EnquiryForm()

    return render(request, 'core/contact.html', {
        'form':         form,
        'form_success': form_success,
        'form_error':   form_error,
    })


def _landing_view(request, template, topic):
    form_success = False
    form_error = False
    if request.method == 'POST':
        if request.POST.get('website'):
            return redirect('home')
        data = request.POST.copy()
        data['help_topic']     = topic
        data['contact_method'] = data.get('contact_method', 'either')
        form = EnquiryForm(data)
        if form.is_valid():
            try:
                enquiry = form.save()
                send_mail(
                    subject='New Enquiry from Aurex Core Website',
                    message=(
                        f"Name: {enquiry.full_name}\n"
                        f"Company: {enquiry.company}\n"
                        f"Email: {enquiry.email}\n"
                        f"Phone: {enquiry.phone}\n"
                        f"Help Topic: {enquiry.help_topic}\n"
                        f"Contact Method: {enquiry.contact_method}\n"
                        f"Message: {enquiry.message}\n"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['hello@aurexcore.nz'],
                    fail_silently=False,
                )
                form_success = True
            except Exception as e:
                form_error = True
    return render(request, template, {
        'form_success': form_success,
        'form_error':   form_error,
    })


def landing_ai(request):
    return _landing_view(request, 'core/landing_ai.html', 'ai_automation')

def landing_workplace(request):
    return _landing_view(request, 'core/landing_workplace.html', 'modern_workplace')

def landing_security(request):
    return _landing_view(request, 'core/landing_security.html', 'cybersecurity')

def landing_infrastructure(request):
    return _landing_view(request, 'core/landing_infrastructure.html', 'cloud_infrastructure')


def robots_txt(request):
    from django.http import HttpResponse
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        "Disallow: /admin/\n"
        "Disallow: /admin/*\n"
        "\n"
        "Sitemap: https://www.aurexcore.com/sitemap.xml\n"
    )
    return HttpResponse(content, content_type='text/plain')


def sitemap_xml(request):
    from django.http import HttpResponse
    from django.utils import timezone
    today = timezone.now().date().isoformat()
    base = 'https://www.aurexcore.com'
    urls = [
        {'loc': f'{base}/',                                                    'priority': '1.0', 'freq': 'weekly'},
        {'loc': f'{base}/solutions/',                                          'priority': '0.9', 'freq': 'weekly'},
        {'loc': f'{base}/ai-intelligent-automation/',                          'priority': '0.9', 'freq': 'monthly'},
        {'loc': f'{base}/cloud-infrastructure-platform-engineering/',          'priority': '0.9', 'freq': 'monthly'},
        {'loc': f'{base}/cybersecurity-backup-business-continuity/',           'priority': '0.9', 'freq': 'monthly'},
        {'loc': f'{base}/modern-workplace-business-applications/',             'priority': '0.8', 'freq': 'monthly'},
        {'loc': f'{base}/networking-devices-physical-infrastructure/',         'priority': '0.8', 'freq': 'monthly'},
        {'loc': f'{base}/industries/',                                         'priority': '0.8', 'freq': 'monthly'},
        {'loc': f'{base}/about/',                                              'priority': '0.7', 'freq': 'monthly'},
        {'loc': f'{base}/insights/',                                           'priority': '0.8', 'freq': 'weekly'},
        {'loc': f'{base}/contact/',                                            'priority': '0.7', 'freq': 'monthly'},
    ]
    for post in InsightPost.objects.filter(published=True).order_by('-published_at'):
        urls.append({'loc': f'{base}/insights/{post.slug}/', 'priority': '0.7', 'freq': 'monthly'})

    items = ''.join(
        f'<url><loc>{u["loc"]}</loc><lastmod>{today}</lastmod>'
        f'<changefreq>{u["freq"]}</changefreq><priority>{u["priority"]}</priority></url>'
        for u in urls
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'
    return HttpResponse(xml, content_type='application/xml')
