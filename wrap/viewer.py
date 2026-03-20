import os
import sys
import threading
import webview

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_dat_path():
    return os.path.join(get_base_dir(), 'data.dat')

def load_codes():
    dat_path = get_dat_path()
    if not os.path.exists(dat_path):
        with open(dat_path, 'w', encoding='utf-8') as f:
            f.write('')
    with open(dat_path, 'r', encoding='utf-8') as f:
        codes = [line.strip() for line in f if line.strip()]
    if codes:
        return ','.join(codes)
    return None

def build_url(codes=None):
    url = 'https://www.applecubic.life/h'
    if codes:
        url += f'?codes={codes}'
    return url

def calc_height(code_count):
    return min(600, max(200, 100 + code_count * 25))

# 시작 시 바로 보여줄 로컬 HTML (가짜 보고서)
STARTUP_HTML = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:10px;font-family:Gulim,sans-serif;font-size:12px;color:#000;background:#fff;">
    <h3 style="font-size:13px;margin:0 0 6px 0;font-weight:bold;">일일 업무 현황</h3>
    <p style="margin:2px 0;font-size:11px;"><b>작성일:</b> <script>document.write(new Date().toLocaleDateString('ko-KR'))</script> &nbsp; <b>작성자:</b> 홍길동</p>
    <hr style="border:none;border-top:1px solid #ccc;margin:5px 0;">
    <p style="margin:2px 0 2px 0;font-size:11px;font-weight:bold;">1. 금일 업무</p>
    <p style="margin:1px 0 1px 10px;font-size:11px;">- 고객사 요구사항 분석 및 정리</p>
    <p style="margin:1px 0 1px 10px;font-size:11px;">- 주간 실적 보고서 작성</p>
    <p style="margin:1px 0 1px 10px;font-size:11px;">- 내부 시스템 점검</p>
    <p style="margin:4px 0 2px 0;font-size:11px;font-weight:bold;">2. 명일 계획</p>
    <p style="margin:1px 0 1px 10px;font-size:11px;">- 월간 실적 집계 및 보고</p>
    <p style="margin:1px 0 1px 10px;font-size:11px;">- 신규 프로젝트 킥오프 미팅</p>
</body>
</html>
"""

EDITOR_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: 'Gulim', sans-serif; margin: 10px; font-size: 12px; }
    h3 { font-size: 13px; margin: 0 0 8px 0; font-weight: normal; }
    textarea { width: 100%; height: 300px; font-family: 'Consolas', monospace; font-size: 13px;
               border: 1px solid #999; padding: 5px; box-sizing: border-box; resize: none; }
    .btn-area { margin-top: 8px; text-align: right; }
    button { padding: 5px 16px; font-size: 12px; cursor: pointer; margin-left: 5px; }
    .info { color: #888; font-size: 11px; margin-bottom: 8px; }
</style>
</head>
<body>
    <h3>코드 편집</h3>
    <div class="info">한 줄에 하나씩 코드를 입력하세요 (예: 005930)</div>
    <textarea id="editor"></textarea>
    <div class="btn-area">
        <button onclick="doCancel()">취소</button>
        <button onclick="doSave()">저장</button>
    </div>
    <script>
        window.addEventListener('pywebviewready', async function() {
            var text = await pywebview.api.get_codes();
            document.getElementById('editor').value = text;
        });
        async function doSave() {
            var text = document.getElementById('editor').value;
            await pywebview.api.save_codes(text);
        }
        function doCancel() {
            pywebview.api.close_editor();
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') doCancel();
        });
    </script>
</body>
</html>
"""

TOGGLE_JS = """
(function() {
    if (window._toggleReady) return;
    window._toggleReady = true;

    // 가짜 업무보고 오버레이 생성
    var overlay = document.createElement('div');
    overlay.id = '_fakeOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:#fff;z-index:9999;padding:10px;font-family:Gulim,sans-serif;font-size:12px;color:#000;overflow:hidden;box-sizing:border-box;';
    overlay.innerHTML = `
        <h3 style="font-size:13px;margin:0 0 6px 0;font-weight:bold;">일일 업무 현황</h3>
        <p style="margin:2px 0;font-size:11px;"><b>작성일:</b> ` + new Date().toLocaleDateString('ko-KR') + ` &nbsp; <b>작성자:</b> 홍길동</p>
        <hr style="border:none;border-top:1px solid #ccc;margin:5px 0;">
        <p style="margin:2px 0 2px 0;font-size:11px;font-weight:bold;">1. 금일 업무</p>
        <p style="margin:1px 0 1px 10px;font-size:11px;">- 고객사 요구사항 분석 및 정리</p>
        <p style="margin:1px 0 1px 10px;font-size:11px;">- 주간 실적 보고서 작성</p>
        <p style="margin:1px 0 1px 10px;font-size:11px;">- 내부 시스템 점검</p>
        <p style="margin:4px 0 2px 0;font-size:11px;font-weight:bold;">2. 명일 계획</p>
        <p style="margin:1px 0 1px 10px;font-size:11px;">- 월간 실적 집계 및 보고</p>
        <p style="margin:1px 0 1px 10px;font-size:11px;">- 신규 프로젝트 킥오프 미팅</p>
    `;
    document.body.appendChild(overlay);

    // 오버레이가 보일 때 뒤의 콘텐츠 완전히 숨기기
    var bodyChildren = document.body.children;
    for (var j = 0; j < bodyChildren.length; j++) {
        if (bodyChildren[j].id !== '_fakeOverlay') {
            bodyChildren[j].style.display = 'none';
        }
    }

    var visible = false;
    var hideTimer = null;
    document.addEventListener('keydown', function(e) {
        if (e.key === 'a' || e.key === 'A') {
            visible = !visible;
            if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
            var color = visible ? '#000' : '#fff';
            var border = visible ? '#999' : '#fff';
            var headBg = visible ? '#f0f0f0' : '#fff';
            var subColor = visible ? '#666' : '#fff';

            // 오버레이 토글
            overlay.style.display = visible ? 'none' : 'block';
            if (!visible) { overlay.style.color = '#000'; }

            // body의 오버레이 제외한 모든 자식 숨김/표시
            var bodyChildren = document.body.children;
            for (var j = 0; j < bodyChildren.length; j++) {
                if (bodyChildren[j].id !== '_fakeOverlay') {
                    bodyChildren[j].style.display = visible ? '' : 'none';
                }
            }

            if (visible) {
                document.body.style.color = color;
                var cells = document.querySelectorAll('th, td');
                for (var i = 0; i < cells.length; i++) {
                    cells[i].style.borderColor = border;
                }
                var tables = document.querySelectorAll('table');
                for (var i = 0; i < tables.length; i++) {
                    tables[i].style.borderColor = border;
                }
                var headRows = document.querySelectorAll('thead tr');
                for (var i = 0; i < headRows.length; i++) {
                    headRows[i].style.backgroundColor = headBg;
                }
                var divs = document.querySelectorAll('div:not(#_fakeOverlay):not(#_fakeOverlay *)');
                for (var i = 0; i < divs.length; i++) {
                    divs[i].style.color = color;
                }
                var subs = document.querySelectorAll('div[style*="font-size"]');
                for (var i = 0; i < subs.length; i++) {
                    subs[i].style.color = subColor;
                }
            }
            if (visible) {
                hideTimer = setTimeout(function() {
                    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}));
                }, 5000);
            }
        }
        if (e.key === 'i' || e.key === 'I') {
            pywebview.api.open_editor();
        }
    });
})();
"""


class Api:
    def __init__(self):
        self.main_window = None
        self.editor_window = None
        self._lock = threading.Lock()
        self._remote_loaded = False

    def get_codes(self):
        dat_path = get_dat_path()
        if os.path.exists(dat_path):
            with open(dat_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ''

    def save_codes(self, text):
        dat_path = get_dat_path()
        with open(dat_path, 'w', encoding='utf-8') as f:
            f.write(text)
        def _update():
            try:
                if self.editor_window is not None:
                    self.editor_window.destroy()
                    self.editor_window = None
            except Exception:
                self.editor_window = None
            codes = load_codes()
            url = build_url(codes)
            try:
                self._remote_loaded = False
                self.main_window.load_url(url)
                code_count = len(codes.split(',')) if codes else 2
                self.main_window.resize(450, calc_height(code_count))
            except Exception:
                pass
        threading.Thread(target=_update, daemon=True).start()

    def open_editor(self):
        with self._lock:
            if self.editor_window is not None:
                return
            try:
                self.editor_window = webview.create_window(
                    title='코드 편집',
                    html=EDITOR_HTML,
                    width=320,
                    height=460,
                    resizable=False,
                    js_api=self,
                    on_top=True
                )
                self.editor_window.events.closed += self._on_editor_closed
            except Exception:
                self.editor_window = None

    def _on_editor_closed(self):
        self.editor_window = None

    def close_editor(self):
        def _close():
            try:
                if self.editor_window is not None:
                    self.editor_window.destroy()
                    self.editor_window = None
            except Exception:
                self.editor_window = None
        threading.Thread(target=_close, daemon=True).start()

    def load_remote(self):
        """시작 HTML이 로드된 후 백그라운드에서 원격 URL 로드"""
        codes = load_codes()
        url = build_url(codes)
        try:
            self.main_window.load_url(url)
        except Exception:
            pass


def create_app():
    codes = load_codes()
    code_count = len(codes.split(',')) if codes else 0
    height = calc_height(code_count)

    api = Api()

    codes = load_codes()
    url = build_url(codes)

    # 숨긴 상태로 시작, 원격 URL 직접 로드
    main_window = webview.create_window(
        title='일일 업무 현황',
        url=url,
        width=450,
        height=height,
        resizable=True,
        fullscreen=False,
        frameless=False,
        on_top=False,
        hidden=True,
        js_api=api
    )

    api.main_window = main_window

    def on_loaded():
        # 원격 URL 로드 완료 후 JS 주입하고 창 표시
        try:
            main_window.evaluate_js(TOGGLE_JS)
            main_window.show()
        except Exception:
            try:
                main_window.show()
            except Exception:
                pass

    main_window.events.loaded += on_loaded
    webview.start(private_mode=False)

if __name__ == '__main__':
    create_app()
