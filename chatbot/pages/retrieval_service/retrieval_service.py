import os
import faiss
import numpy as np
from flask import Flask, request, jsonify


app = Flask(__name__)


# Get the directory of the current script
current_dir = os.path.dirname(os.path.abspath(__file__))

# Build the path to the FAISS index file in the same directory
index_path = os.path.join(current_dir, "faiss_index.index")

# Load the FAISS index from the file
index = faiss.read_index(index_path)

# Define the path to the directory containing the text files
current_dir = os.path.dirname(os.path.abspath(__file__))
documents_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "embeddings", "lecture_transcripts"))
print("📂 Loading documents from:", documents_dir)
# Populate the documents list by reading each text file in the documents directory
filenames = sorted(os.listdir(documents_dir))  # sort files
documents = []

for filename in filenames:
    file_path = os.path.join(documents_dir, filename)
    if os.path.isfile(file_path) and filename.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as file:
            documents.append(file.read())

@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    # Expecting a float32 embedding array and an optional k parameter.
    embedding = np.array(data["embedding"], dtype=np.float32)
    k = data.get("k", 3)
    
    # Reshape embedding to 2D array for FAISS (1, d)
    embedding = np.expand_dims(embedding, axis=0)
    distances, indices = index.search(embedding, k)
    
    # Retrieve corresponding documents (skip invalid indices)
    results = [documents[i] for i in indices[0] if i != -1]
    return jsonify({ "documents": results })

if __name__ == "__main__":
    app.run(port=5050)