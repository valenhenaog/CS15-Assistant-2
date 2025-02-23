import openai # openai libraries
import numpy as np # for fast vectors
from pathlib import Path # for iterating through every file
import faiss # efficient nearest-neighbor search

import os
print("Current working directory:", os.getcwd())

# Set your OpenAI API Key
openai.api_key = "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"

# Store the text files in a dictionary {filename: filedata}
def read_txt_files(folder_path):
    folder = Path(folder_path)
    text_data = {}

    for file in folder.glob("*.[tT][xX][tT]"):  # Find all .txt files
        with open(file, "r", encoding="utf-8") as f:
            text_data[file.name] = f.read()

    return text_data  # Returns a dictionary {filename: file_content}

# Function to generate embeddings
def get_embedding(text, model="text-embedding-ada-002"):
    response = openai.embeddings.create(input=text, model=model)
    return response.data[0].embedding


# folder with trasncripts (stored as a {filename: filedata} dictionary):
folder_path = "embeddings/lecture_transcripts" # ------THE FILEPATH MAY CREATE ISSUES--------
texts = read_txt_files(folder_path)
files = list(Path(folder_path).glob("*.txt"))
print("Files found:", files)

# Generate embeddings
embeddings = {filename: get_embedding(content) for filename, content in texts.items()}

# Convert embeddings to NumPy array for FAISS
embedding_list = np.array(list(embeddings.values()), dtype=np.float32)

# Save filenames for retrieval later
filenames = list(embeddings.keys())

# Determine the dimensionality of your embeddings
d = embedding_list.shape[1]

# Create a FAISS index using L2 (Euclidean) distance
index = faiss.IndexFlatL2(d)
index.add(embedding_list)  # Add all your document embeddings to the index

print("Number of embeddings indexed:", index.ntotal)

# Save embeddings to a file
faiss.write_index(index, "faiss_index.index")

# To load the index later: index = faiss.read_index("faiss_index.index")
