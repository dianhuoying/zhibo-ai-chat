using LiveAssistant.Bridge;

namespace LiveAssistant.Services;

public class TtsService
{
    private readonly MessageDispatcher _dispatcher;
    private bool _isGenerating;

    public TtsService(MessageDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    public async Task SpeakAsync(string text, VoiceType voice)
    {
        _isGenerating = true;
        await _dispatcher.PushAsync("tts:start", new { text, voice = voice.ToString().ToLower() });

        // Simulate uncertain animation (TTS is full response, no percentage)
        for (int i = 0; i < 12; i++)
        {
            await Task.Delay(200 + Random.Shared.Next(100));
        }

        _isGenerating = false;
        await _dispatcher.PushAsync("tts:complete", new { duration = text.Length * 80 });
    }

    public bool IsGenerating => _isGenerating;
}
