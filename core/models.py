from django.db import models
from django.utils import timezone


class Enquiry(models.Model):
    """Contact form submission."""
    HELP_TOPICS = [
        ('ai_automation',        'AI and Intelligent Automation'),
        ('cloud_infrastructure', 'Cloud, Infrastructure and Platform Engineering'),
        ('cybersecurity',        'Cybersecurity, Backup and Business Continuity'),
        ('modern_workplace',     'Modern Workplace and Business Applications'),
        ('networking',           'Networking, Devices and Physical Infrastructure'),
        ('strategy_call',        'General Strategy Call'),
        ('other',                'Other'),
    ]
    CONTACT_METHODS = [
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('either', 'Either'),
    ]

    full_name      = models.CharField(max_length=120)
    company        = models.CharField(max_length=120)
    email          = models.EmailField()
    phone          = models.CharField(max_length=30, blank=True)
    help_topic     = models.CharField(max_length=30, choices=HELP_TOPICS, default='strategy_call')
    contact_method = models.CharField(max_length=10, choices=CONTACT_METHODS, default='either')
    message        = models.TextField()
    submitted_at   = models.DateTimeField(default=timezone.now)
    is_read        = models.BooleanField(default=False)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Enquiry'
        verbose_name_plural = 'Enquiries'

    def __str__(self):
        return f"{self.full_name} — {self.company} ({self.submitted_at:%d %b %Y})"


class InsightPost(models.Model):
    """Insight / thought-leadership article."""
    CATEGORIES = [
        ('AI & Automation',      'AI & Automation'),
        ('Cloud & Infrastructure','Cloud & Infrastructure'),
        ('Cybersecurity',        'Cybersecurity'),
        ('Modern Workplace',     'Modern Workplace'),
        ('Strategy',             'Strategy'),
    ]

    title        = models.CharField(max_length=200)
    slug         = models.SlugField(unique=True)
    category     = models.CharField(max_length=30, choices=CATEGORIES)
    excerpt      = models.CharField(max_length=300)
    body         = models.TextField()
    published    = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('insight_detail', kwargs={'slug': self.slug})
