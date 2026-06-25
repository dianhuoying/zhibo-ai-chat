using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using LiveAssistant.Services;

namespace LiveAssistant;

public partial class MainWindow : Window
{
    private const string WebUiRoot = "WebUI";
    private const int WM_HOTKEY = 0x0312;
    private const int HOTKEY_ID_MUTE = 1;

    private ServiceOrchestrator? _orchestrator;
    private NotifyIcon? _trayIcon;
    private bool _isHotkeyRegistered;
    private double _normalWidth, _normalHeight;
    private double _normalLeft, _normalTop;
    private bool _isFolded;

    public MainWindow()
    {
        InitializeComponent();
        Closing += OnClosing;
    }

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        var src = HwndSource.FromHwnd(new WindowInteropHelper(this).Handle);
        if (src != null) { src.AddHook(WndProc); RegisterHotKeys(); }
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        PositionWindow();
        SetupTrayIcon();
        await InitializeWebViewAsync();
    }

        private void Window_StateChanged(object sender, EventArgs e)
    {
        if (WindowState == WindowState.Minimized)
        {
            Hide();
            if (_trayIcon != null) _trayIcon.Visible = true;
        }
    }

    private void PositionWindow()
    {
        var screen = System.Windows.Forms.Screen.PrimaryScreen;
        if (screen == null) return;
        var working = screen.WorkingArea;
        Left = working.Right - Width - 8;
        Top = working.Top + 8;
        _normalWidth = Width;
        _normalHeight = Height;
        _normalLeft = Left;
        _normalTop = Top;
    }

    private void SetupTrayIcon()
    {
        _trayIcon = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Text = "鏅烘挱鍔╄亰",
            Visible = false
        };
        _trayIcon.DoubleClick += (s, e) =>
        {
            Show();
            WindowState = WindowState.Normal;
            _trayIcon.Visible = false;
        };
    }

    /// <summary>Called from WebView2 callback thread 鈥?must marshal to UI thread</summary>
    public void Fold()
    {
        if (_isFolded) return;
        Dispatcher.Invoke(() =>
        {
            if (_isFolded) return;
            _isFolded = true;
            _normalWidth = Width;
            _normalHeight = Height;
            _normalLeft = Left;
            _normalTop = Top;
            Width = 60;
            MinWidth = 60;
            MaxWidth = 60;
            MinHeight = 680;
            MaxHeight = 680;
            ResizeMode = ResizeMode.NoResize;
        });
    }

    /// <summary>Called from WebView2 callback thread 鈥?must marshal to UI thread</summary>
    public void Unfold()
    {
        if (!_isFolded) return;
        Dispatcher.Invoke(() =>
        {
            if (!_isFolded) return;
            _isFolded = false;
            Width = _normalWidth;
            Height = _normalHeight;
            Left = _normalLeft;
            Top = _normalTop;
            MinWidth = 320;
            MaxWidth = double.PositiveInfinity;
            MinHeight = 500;
            MaxHeight = double.PositiveInfinity;
            ResizeMode = ResizeMode.CanResizeWithGrip;
        });
    }

    private void RegisterHotKeys()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        _isHotkeyRegistered = RegisterHotKey(hwnd, HOTKEY_ID_MUTE, 0x0002, 0x4D);
    }
    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_HOTKEY && wParam.ToInt32() == HOTKEY_ID_MUTE)
        {
            if (_orchestrator != null)
            {
                _orchestrator.State.IsMuted = !_orchestrator.State.IsMuted;
                _ = _orchestrator.Dispatcher.PushAsync("audio:muted",
                    new { muted = _orchestrator.State.IsMuted });
            }
            handled = true;
        }
        return IntPtr.Zero;
    }


    private async Task InitializeWebViewAsync()
    {
        var env = await CoreWebView2Environment.CreateAsync();
        await webView.EnsureCoreWebView2Async(env);
        webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = false;
        webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

        var htmlPath = Path.Combine(AppContext.BaseDirectory, WebUiRoot, "index.html");
        webView.CoreWebView2.Navigate(new Uri(htmlPath).AbsoluteUri);

        webView.CoreWebView2.WebMessageReceived += OnWebMessage;

        _orchestrator = new ServiceOrchestrator(this);
    }

    private async void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = e.TryGetWebMessageAsString();
            if (!string.IsNullOrEmpty(json) && _orchestrator != null)
            {
                await _orchestrator.Dispatcher.DispatchAsync(json);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"WebMessage error: {ex.Message}");
        }
    }

    public async Task InvokeJsAsync(string function, string jsonArgs)
    {
        var escaped = System.Text.Json.JsonEncodedText.Encode(jsonArgs);
        await webView.CoreWebView2.ExecuteScriptAsync($"{function}({escaped})");
    }

    private void OnClosing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _trayIcon?.Dispose();
        if (_isHotkeyRegistered)
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            UnregisterHotKey(hwnd, HOTKEY_ID_MUTE);
        }
    }

    [DllImport("user32.dll")]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);
}
