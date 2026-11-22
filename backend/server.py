import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
from game import Game

game = Game()

class GameHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/state":
            return super().do_GET()

        body = json.dumps(game.get_state()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_POST(self):
        global game
        if self.path == "/move/left":
            game.move_current_tank(-5)
        elif self.path == "/move/right":
            game.move_current_tank(5)
        elif self.path == "/fire":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 <= length <= 1024:
                    raise ValueError

                angle = 30 if length == 0 else float(
                    json.loads(self.rfile.read(length))["angle"]
                )
                if not 0 <= angle <= 80:
                    raise ValueError
            except (ValueError, TypeError, KeyError):
                self.send_error(400, "Angle must be between 0 and 80")
                return

            if game.currentPlayer == 1:
                angle = 180 - angle

            game.play_round(angle, 100)
        elif self.path == "/tick":
        # Advance five simulation steps for each browser update.
            for _ in range(5):
                if game.shot is None:
                    break
                game.update(1 / 30)
        elif self.path == "/reset":
            # Start a fresh match with the default game state.
            game = Game()
        else:
            self.send_error(404)
            return

        self.send_response(204)
        self.end_headers()

        

if __name__ == "__main__":
    frontend = Path(__file__).resolve().parent.parent / "frontend"
    print(frontend / "style.css", flush=True)
    handler = partial(GameHandler, directory=str(frontend))
    HTTPServer(("127.0.0.1", 8000), handler).serve_forever()