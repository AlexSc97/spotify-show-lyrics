[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync().GetResults()
$session = $manager.GetCurrentSession()
if ($session -ne $null) {
    $timeline = $session.GetTimelineProperties()
    $position = $timeline.Position.TotalSeconds
    $mediaProps = $session.TryGetMediaPropertiesAsync().GetResults()
    $artist = $mediaProps.Artist
    $title = $mediaProps.Title
    Write-Output "Artist: $artist"
    Write-Output "Title: $title"
    Write-Output "Position: $position"
} else {
    Write-Output "No active media session"
}
