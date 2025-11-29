from django.urls import path
from . import views

app_name = 'music'  # app name to tell Django the namespace for this app

urlpatterns = [
    # Add your URL patterns here
    path('', views.home, name='home'),
    path('songs/', views.song_list, name='song_list'),
    path('playlists/', views.playlist_list, name='playlists'),
    path('playlists/<int:pk>/', views.playlist_details, name='playlist_details'),
    path('player/<int:song_id>/', views.player, name='player'),
]
