import os
import uvicorn
from fastapi import FastAPI
from pathlib import Path
from pydantic import BaseModel


data_root = Path("/var/CoH-Data")
app = FastAPI()


class UploadRequest(BaseModel):
    path: str
    contents: str


@app.post("/upload")
async def post_file(request: UploadRequest):
    path = os.path.abspath(data_root / request.path)
    if not path.startswith(str(data_root)):
        raise ValueError("invalid path")
    
    print("Uploading", request)
    
    with open(path, "w") as f:
        f.write(request.contents)


if __name__ == '__main__':
    uvicorn.run(app, port=80, host="0.0.0.0")