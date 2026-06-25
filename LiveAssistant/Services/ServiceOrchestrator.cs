using System.Runtime.InteropServices;
using System.Windows.Interop;
using LiveAssistant.Bridge;

namespace LiveAssistant.Services;

public class ServiceOrchestrator
{
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    private readonly MainWindow _window;
    public AppState State { get; } = new();
    public DanmakuService Danmaku { get; }
    public AudioService Audio { get; } = new();
    public AiReplyService Ai { get; }
    public TtsService Tts { get; }
    public MessageDispatcher Dispatcher { get; }

    public ServiceOrchestrator(MainWindow window)
    {
        _window = window;
        Dispatcher = new MessageDispatcher(_window);
        Danmaku = new DanmakuService(Dispatcher);
        Ai = new AiReplyService(Dispatcher);
        Tts = new TtsService(Dispatcher);
        RegisterHandlers();
    }
    private void RegisterHandlers()
    {
        var h = new WindowInteropHelper(_window).Handle;

        // Window drag �� JS sends beginDrag, C# sends WM_NCLBUTTONDOWN to start native drag
        Dispatcher.Register("window:beginDrag", _ => {
            _window.Dispatcher.Invoke(() => {
                var hwnd = new WindowInteropHelper(_window).Handle;
                ReleaseCapture();
                SendMessage(hwnd, 0xA1, new IntPtr(2), IntPtr.Zero);
            });
            return Task.FromResult<object?>(null);
        });

        Dispatcher.Register("window:minimize", _ => {
            _window.WindowState = System.Windows.WindowState.Minimized;
            return Task.FromResult<object?>(null);
        });
        Dispatcher.Register("window:maximize", _ => {
            _window.WindowState = _window.WindowState == System.Windows.WindowState.Maximized
                ? System.Windows.WindowState.Normal
                : System.Windows.WindowState.Maximized;
            return Task.FromResult<object?>(null);
        });
        Dispatcher.Register("window:close", _ => {
            _window.Close();
            return Task.FromResult<object?>(null);
        });

        // Fold/Unfold
        Dispatcher.Register("window:fold", async _ => {
            State.IsFolded = true;
            _window.Fold();
            await Dispatcher.PushAsync("window:folded", new { });
            return null;
        });
        Dispatcher.Register("window:unfold", async _ => {
            State.IsFolded = false;
            _window.Unfold();
            await Dispatcher.PushAsync("window:unfolded", new { });
            return null;
        });

        // Connection
        Dispatcher.Register("state:connect", async d => {
            State.IsConnected = true;
            State.LiveStartTime = DateTime.UtcNow;
            State.ConnectionUrl = d.GetProperty("url").GetString() ?? "";
            State.CurrentPlatform = d.GetProperty("platform").GetString() ?? "douyin";
            await Dispatcher.PushAsync("state:update", new { connected = true, duration = State.LiveDuration });
            await Dispatcher.PushAsync("connection:status", new { connected = true, url = State.ConnectionUrl });
            return null;
        });
        Dispatcher.Register("state:disconnect", async _ => {
            State.IsConnected = false;
            State.LiveStartTime = null;
            State.ConnectionUrl = "";
            await Dispatcher.PushAsync("state:update", new { connected = false, duration = "00:00:00" });
            await Dispatcher.PushAsync("connection:status", new { connected = false });
            return null;
        });

        // Persona
        Dispatcher.Register("persona:set", d => {
            var personaStr = d.GetProperty("persona").GetString() ?? "gamer";
            var customName = d.TryGetProperty("customName", out var cn) ? cn.GetString() : null;
            State.CurrentPersona = personaStr switch {
                "gamer" => Persona.Gamer,
                "seller" => Persona.Seller,
                "companion" => Persona.Companion,
                _ => Persona.Custom
            };
            return Task.FromResult<object?>(new { persona = personaStr, customName });
        });

        // Voice
        Dispatcher.Register("voice:set", d => {
            var voice = d.GetProperty("voice").GetString() ?? "male";
            State.CurrentVoice = voice switch {
                "male" => VoiceType.Male,
                "female" => VoiceType.Female,
                "custom" => VoiceType.Custom,
                _ => VoiceType.Male
            };
            return Task.FromResult<object?>(new { voice });
        });
        Dispatcher.Register("voice:preview", d => {
            var voice = d.GetProperty("voice").GetString() ?? "male";
            _ = Tts.SpeakAsync("Hello", voice switch {
                "female" => VoiceType.Female,
                "custom" => VoiceType.Custom,
                _ => VoiceType.Male
            });
            return Task.FromResult<object?>(null);
        });

        // Platform
        Dispatcher.Register("platform:set", d => {
            State.CurrentPlatform = d.GetProperty("platform").GetString() ?? "douyin";
            return Task.FromResult<object?>(new { platform = State.CurrentPlatform });
        });

        // Takeover mode
        Dispatcher.Register("mode:takeover", async d => {
            State.IsTakeoverAuto = d.GetProperty("auto").GetBoolean();
            await Dispatcher.PushAsync("mode:takeover", new { auto = State.IsTakeoverAuto });
            return null;
        });

        // Mute
        Dispatcher.Register("audio:mute", async d => {
            State.IsMuted = d.GetProperty("muted").GetBoolean();
            await Dispatcher.PushAsync("audio:muted", new { muted = State.IsMuted });
            return null;
        });

        // AI generate
        Dispatcher.Register("ai:generate", async d => {
            var id = d.GetProperty("commentId").GetString() ?? "";
            var content = d.GetProperty("content").GetString() ?? "";
            var userName = d.GetProperty("userName").GetString() ?? "";
            var c = Danmaku.GetRecent(200).FirstOrDefault(x => x.Id == id);
            if (c != null) {
                _ = Ai.GenerateReplyAsync(c, State.CurrentPersona);
            }
            await Task.CompletedTask;
            return null;
        });

        // Stream manual send
        Dispatcher.Register("stream:send", d => {
            var text = d.GetProperty("text").GetString() ?? "";
            Danmaku.Ingest(new LiveComment {
                UserName = "Host",
                Content = text,
                IsVip = true,
                Priority = 100
            });
            return Task.FromResult<object?>(null);
        });

        // Quick replies
        Dispatcher.Register("quickreply:send", async d => {
            var text = d.GetProperty("text").GetString() ?? "";
            await Dispatcher.PushAsync("quickreply:sent", new { text });
            return null;
        });
        Dispatcher.Register("quickreply:save", _ => {
            return Task.FromResult<object?>(null);
        });

        // Stats
        Dispatcher.Register("stats:reset", async _ => {
            await Dispatcher.PushAsync("stats:update", new {
                totalReplies = 0, voiceReplies = 0, textReplies = 0,
                trendData = Array.Empty<int>(),
                categoryBreakdown = new { question = 0, social = 0, noise = 0 }
            });
            return null;
        });

        // Log
        Dispatcher.Register("log:export", async d => {
            var data = d.GetProperty("data").GetString() ?? "";
            await Dispatcher.PushAsync("log:exported", new { success = true });
            return null;
        });
        Dispatcher.Register("log:clear", async _ => {
            await Dispatcher.PushAsync("log:cleared", new { });
            return null;
        });
        Dispatcher.Register("log:flag", d => {
            var flagged = d.GetProperty("flagged").GetBoolean();
            return Task.FromResult<object?>(new { flagged });
        });

        // Initialize
        Dispatcher.Register("get:initialState", _ => Task.FromResult<object?>(new {
            connected = State.IsConnected,
            duration = State.LiveDuration,
            persona = State.CurrentPersona.ToString().ToLower(),
            voice = State.CurrentVoice.ToString().ToLower(),
            platform = State.CurrentPlatform,
            muted = State.IsMuted,
            folded = State.IsFolded
        }));

        // TTS
        Dispatcher.Register("tts:speak", d => {
            _ = Tts.SpeakAsync(d.GetProperty("text").GetString() ?? "", State.CurrentVoice);
            return Task.FromResult<object?>(null);
        });
    }
}