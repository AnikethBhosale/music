from django.db import models
from mutagen import File as MutagenFile
from datetime import timedelta

# One for songs and other for playlists

class Song(models.Model):
    title = models.CharField(max_length=200)
    audio_file = models.FileField(upload_to='songs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    duration = models.DurationField(null=True, blank=True, editable=False)
    cover_image = models.ImageField(upload_to='covers/', null=True, blank=True)

    def save(self, *args, **kwargs):
        # Save first to ensure file is on disk
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Auto-extract duration from audio file if not already set
        if self.audio_file and not self.duration:
            try:
                audio = MutagenFile(self.audio_file.path)
                if audio and hasattr(audio.info, 'length'):
                    self.duration = timedelta(seconds=int(audio.info.length))
                    # Save again with the extracted duration
                    super().save(update_fields=['duration'])
            except Exception:
                pass  # If extraction fails, duration remains None
    
    def __str__(self):
        return self.title

class Playlist(models.Model):
    name = models.CharField(max_length=200)
    songs = models.ManyToManyField(Song, related_name='playlists')
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name