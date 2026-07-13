import sys
import os

# Insert backend directory into python path so imports in backend/main.py work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from main import app
