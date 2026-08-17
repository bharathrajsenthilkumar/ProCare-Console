import os
import sys

# Add the backend root directory to sys.path so the 'app' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
