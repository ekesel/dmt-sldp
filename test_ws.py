import asyncio
import websockets
import json

async def test():
    token = "FAKE"
    # we need a real token, let's query db
    import sys
    sys.path.append("/Users/ekesel/Desktop/projects/DMT-SLDP/backend")
    # Actually just run this inside django shell
