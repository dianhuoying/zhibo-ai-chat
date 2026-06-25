using System.Collections.Concurrent;
using LiveAssistant.Bridge;

namespace LiveAssistant.Services;

public class DanmakuService
{
    private readonly ConcurrentDictionary<string, LiveComment> _seen = new();
    private readonly List<LiveComment> _buffer = new(128);
    private readonly MessageDispatcher _dispatcher;
    private readonly object _lock = new();

    public int ActivityLevel { get; private set; }

    public DanmakuService(MessageDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    public void Ingest(LiveComment comment)
    {
        if (!_seen.TryAdd(comment.Id, comment)) return;

        comment.Priority = (comment.IsVip ? 40 : 0) +
                           Math.Min(comment.UserLevel * 2, 30) +
                           Math.Min(comment.VisitCount, 30);

        // Auto-classify category
        comment.Category = ClassifyComment(comment.Content);

        lock (_lock)
        {
            _buffer.Add(comment);
            if (_buffer.Count > 200)
                _buffer.RemoveRange(0, 100);
            ActivityLevel = Math.Min(100, _buffer.Count);
        }

        _ = _dispatcher.PushAsync("danmaku:new", new {
            id = comment.Id,
            userName = comment.UserName,
            content = comment.Content,
            priority = comment.Priority,
            category = comment.Category,
            visitCount = comment.VisitCount,
            interactionSummary = comment.InteractionSummary,
            isVip = comment.IsVip,
            filtered = comment.Filtered
        });

        _ = _dispatcher.PushAsync("danmaku:activity", new { level = ActivityLevel });

        // Push to log
        _ = _dispatcher.PushAsync("log:entry", new {
            userName = comment.UserName,
            content = comment.Content,
            filtered = comment.Filtered || comment.Category == "noise",
            reply = comment.Reply
        });
    }

    private static string ClassifyComment(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return "noise";
        if (content.Any(c => c == '?' || c == '？') ||
            content.Contains("什么") || content.Contains("怎么") ||
            content.Contains("为什么") || content.Contains("多少") ||
            content.Contains("请问"))
            return "question";
        if (content.Length < 3 || content.Contains("666") || content.Contains("哈哈"))
            return "noise";
        return "social";
    }

    public void IngestBatch(IEnumerable<LiveComment> comments) {
        foreach (var c in comments) Ingest(c);
    }

    public IReadOnlyList<LiveComment> GetRecent(int count = 20) {
        lock (_lock) {
            return _buffer.Skip(Math.Max(0, _buffer.Count - count)).ToList();
        }
    }
}
