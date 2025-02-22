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
    return response["data"][0]["embedding"]


# folder with trasncripts (stored as a {filename: filedata} dictionary):
folder_path = "CS15-Assistant/embeddings/lecture_transcripts" # ------THE FILEPATH MAY CREATE ISSUES--------
texts = read_txt_files(folder_path)
files = list(Path(folder_path).glob("*.txt"))
print("Files found:", files)

# Generate embeddings
embeddings = {filename: get_embedding(content) for filename, content in texts.items()}

# Convert embeddings to NumPy array for FAISS
embedding_list = np.array(list(embeddings.values()), dtype=np.float32)

# Save filenames for retrieval later
filenames = list(embeddings.keys())

# Print first 5 values of an example embedding
print(f"Example embedding for {filenames[0]}: {embedding_list[0][:5]}")