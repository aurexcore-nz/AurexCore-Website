from django.contrib import admin
from .models import Enquiry, InsightPost


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'company', 'email', 'help_topic', 'submitted_at', 'is_read']
    list_filter   = ['help_topic', 'is_read', 'submitted_at']
    search_fields = ['full_name', 'company', 'email', 'message']
    readonly_fields = ['submitted_at']
    ordering      = ['-submitted_at']

    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
    mark_as_read.short_description = 'Mark selected enquiries as read'
    actions = ['mark_as_read']


@admin.register(InsightPost)
class InsightPostAdmin(admin.ModelAdmin):
    list_display  = ['title', 'category', 'published', 'published_at']
    list_filter   = ['category', 'published']
    search_fields = ['title', 'excerpt', 'body']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published_at'
