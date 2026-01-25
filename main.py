from app import create_app
from app.config import config

app = create_app(config)

if __name__ == "__main__":
    app.run(debug=config.DEBUG, host="0.0.0.0", port=config.PORT)
