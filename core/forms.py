from django import forms
from .models import Enquiry


class EnquiryForm(forms.ModelForm):
    class Meta:
        model = Enquiry
        fields = ['full_name', 'company', 'email', 'phone', 'help_topic', 'contact_method', 'message']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            field.widget.attrs.update({'class': 'form-input'})
        self.fields['message'].widget = forms.Textarea(attrs={'class': 'form-input resize-none', 'rows': 5})

    def clean(self):
        cleaned_data = super().clean()
        # Honeypot check handled in view
        return cleaned_data
