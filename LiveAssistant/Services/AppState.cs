namespace LiveAssistant.Services;

public enum AiMode { Manual, SemiAuto, FullAuto }
public enum Persona { Gamer, Seller, Companion, Custom }
public enum VoiceType { Male, Female, Custom }
public enum EmotionTag { Enthusiastic, Playful, Calm, Warm, Witty, Caring }
public enum CommentCategory { Question, Social, Noise }

public class AppState
{
    public bool IsConnected { get; set; }
    public DateTime? LiveStartTime { get; set; }
    public string LiveDuration => LiveStartTime.HasValue
        ? (DateTime.UtcNow - LiveStartTime.Value).ToString(@"hh\:mm\:ss")
        : "00:00:00";
    public Persona CurrentPersona { get; set; } = Persona.Gamer;
    public VoiceType CurrentVoice { get; set; } = VoiceType.Male;
    public bool IsMuted { get; set; }
    public bool IsFolded { get; set; }
    public string CurrentPlatform { get; set; } = "douyin";
    public string ConnectionUrl { get; set; } = "";
    public bool IsTakeoverAuto { get; set; }
}
