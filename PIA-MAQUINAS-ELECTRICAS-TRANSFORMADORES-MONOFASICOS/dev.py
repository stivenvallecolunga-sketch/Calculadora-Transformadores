"""Servidor local para probar sin Vercel:  python dev.py  → http://localhost:8000"""
import http.server, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))
from calcular import handler as Api

class Dev(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith("/api/calcular"):
            Api.do_POST(self)
        else:
            self.send_error(404)
    _send = Api._send

os.chdir(os.path.dirname(os.path.abspath(__file__)))
print("http://localhost:8000")
http.server.ThreadingHTTPServer(("", 8000), Dev).serve_forever()
