from django.shortcuts import render, get_object_or_404
from .models import Song, Playlist
# Create your views here.


def song_list(request):
    songs = Song.objects.all()
    return render(request, 'songs_list.html', {'songs': songs})

def playlist_list(request): 
    playlists = Playlist.objects.all()
    return render(request, 'playlists_list.html', {'playlists': playlists})

def playlist_details(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk)
    return render(request, 'playlist_details.html', {'playlist': playlist})