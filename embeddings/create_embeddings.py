from pathlib import Path
import os
import openai
import numpy as np
import faiss
from dotenv import load_dotenv
load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

# Function to generate embeddings
def get_embedding(text):
    response = openai.Embedding.create(input=text, model="text-embedding-ada-002")
    return response['data'][0]['embedding']


# folder with trasncripts (stored as a {filename: filedata} dictionary):
folder_path = "embeddings/lecture_transcripts" # ------THE FILEPATH MAY CREATE ISSUES--------

files = sorted(Path(folder_path).glob("*.txt"))  # sort files in docs directory

embedding_list = []
documents = []

# Loop through files in sorted order
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
        embedding = get_embedding(content)
        embedding_list.append(embedding)
        documents.append(content)

# Convert to FAISS index
embedding_array = np.array(embedding_list, dtype=np.float32)
d = embedding_array.shape[1]

index = faiss.IndexFlatL2(d)
index.add(embedding_array)

print("Number of embeddings indexed:", index.ntotal)

# Save index
faiss.write_index(index, "faiss_index.index")
