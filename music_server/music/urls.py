from django.urls import path
from . import views

app_name = 'music'  # app name ti tell Django the namespace for this app

urlpatterns = [
    # Add your URL patterns here
    path('songs/', views.song_list, name='song_list'),
    path('playlists/', views.playlist_list, name='playlists'),
    #path('player/', views.player, name='player'),
]
