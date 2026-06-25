namespace LiveAssistant.Services;

public class LiveComment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserName { get; set; } = "";
    public string Content { get; set; } = "";
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public int UserLevel { get; set; }
    public int VisitCount { get; set; }
    public bool IsVip { get; set; }
    public string Emotion { get; set; } = "neutral";
    public int Priority { get; set; }
    public string InteractionSummary { get; set; } = "";
    public string Category { get; set; } = "social";
    public string Reply { get; set; } = "";
    public bool Filtered { get; set; }
}
