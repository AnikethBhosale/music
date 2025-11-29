from django.shortcuts import render, get_object_or_404
from .models import Song, Playlist
import json
# Create your views here.

def home(request):
    return render(request, 'base.html')

def song_list(request):
    songs = Song.objects.all()
    return render(request, 'songs_list.html', {'songs': songs})

def playlist_list(request): 
    playlists = Playlist.objects.all()
    return render(request, 'playlists_list.html', {'playlists': playlists})

def playlist_details(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk)
    return render(request, 'playlist_details.html', {'playlist': playlist})

def player(request, song_id):
    """
    Player view that handles song playback with queue context
    Accepts query parameters:
    - source: 'playlist' or 'library'
    - playlist_id: ID of playlist if source is 'playlist'
    """
    current_song = get_object_or_404(Song, pk=song_id)
    source = request.GET.get('source', 'library')
    playlist_id = request.GET.get('playlist_id', None)
    
    # Build queue based on source
    if source == 'playlist' and playlist_id:
        playlist = get_object_or_404(Playlist, pk=playlist_id)
        queue = list(playlist.songs.all())
        context_info = {
            'type': 'playlist',
            'name': playlist.name,
            'id': playlist.id
        }
    else:
        # Default to library - all songs ordered by upload date
        queue = list(Song.objects.all().order_by('uploaded_at'))
        context_info = {
            'type': 'library',
            'name': 'Music Library',
            'id': None
        }
    
    # Find current song index in queue
    try:
        current_index = queue.index(current_song)
    except ValueError:
        # If song not in queue, add it at the beginning
        queue.insert(0, current_song)
        current_index = 0
    
    # Prepare queue data for JavaScript
    queue_data = []
    for idx, song in enumerate(queue):
        queue_data.append({
            'id': song.id,
            'title': song.title,
            'audio_url': song.audio_file.url,
            'cover_url': song.cover_image.url if song.cover_image else None,
            'duration': str(song.duration) if song.duration else '0:00:00',
            'is_current': idx == current_index
        })
    
    context = {
        'current_song': current_song,
        'queue_data_json': json.dumps(queue_data),
        'current_index': current_index,
        'context_info': context_info,
        'queue': queue
    }
    
    return render(request, 'player.html', context)