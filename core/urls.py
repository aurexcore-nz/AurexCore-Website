from django.urls import path
from . import views

urlpatterns = [
    # SEO files
    path('sitemap.xml', views.sitemap_xml, name='sitemap_xml'),
    path('robots.txt',  views.robots_txt,  name='robots_txt'),

    # Main pages
    path('',                                           views.home,                 name='home'),
    path('solutions/',                                 views.solutions,            name='solutions'),
    path('ai-intelligent-automation/',                 views.ai_automation,        name='ai_automation'),
    path('cloud-infrastructure-platform-engineering/', views.cloud_infrastructure, name='cloud_infrastructure'),
    path('cybersecurity-backup-business-continuity/',  views.cybersecurity,        name='cybersecurity'),
    path('modern-workplace-business-applications/',    views.modern_workplace,     name='modern_workplace'),
    path('networking-devices-physical-infrastructure/',views.networking,           name='networking'),
    path('industries/',                                views.industries,           name='industries'),
    path('about/',                                     views.about,                name='about'),
    path('insights/',                                  views.insights,             name='insights'),
    path('insights/<slug:slug>/',                      views.insight_detail,       name='insight_detail'),
    path('contact/',                                   views.contact,              name='contact'),

    # Ad landing pages
    path('ai-readiness-assessment/',                   views.landing_ai,           name='landing_ai'),
    path('microsoft-365-modern-workplace-audit/',      views.landing_workplace,    name='landing_workplace'),
    path('cybersecurity-backup-review/',               views.landing_security,     name='landing_security'),
    path('infrastructure-cloud-assessment/',           views.landing_infrastructure, name='landing_infrastructure'),
]
