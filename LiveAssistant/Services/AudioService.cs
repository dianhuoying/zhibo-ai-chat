namespace LiveAssistant.Services;

public class AudioService
{
    public string[] GetOutputDevices()
    {
        return new[] { "Default Speaker", "Headphones", "Virtual Cable" };
    }

    public string[] GetCaptureDevices()
    {
        return new[] { "Default Microphone", "Headset Mic", "Virtual Cable" };
    }

    public string CurrentOutputDevice { get; set; } = "Default Speaker";
    public string CurrentCaptureDevice { get; set; } = "Default Microphone";
    public bool IsMuted { get; set; }

    public void ToggleMute()
    {
        IsMuted = !IsMuted;
    }
}
