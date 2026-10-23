import os
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from config import OLLAMA_HOST, CHROMA_PATH

def get_llm():
    return Ollama(base_url=OLLAMA_HOST, model="llama3")

def get_embeddings():
    return OllamaEmbeddings(base_url=OLLAMA_HOST, model="nomic-embed-text")

def process_text(text: str, notebook_id: str):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = [Document(page_content=text)]
    splits = text_splitter.split_documents(docs)
    
    Chroma.from_documents(
        documents=splits,
        embedding=get_embeddings(),
        collection_name=notebook_id,
        persist_directory=CHROMA_PATH
    )

def generate_chat_response(query: str, notebook_id: str) -> str:
    vectorstore = Chroma(
        collection_name=notebook_id, 
        embedding_function=get_embeddings(), 
        persist_directory=CHROMA_PATH
    )
    docs = vectorstore.similarity_search(query, k=4)
    context = "\n\n".join([d.page_content for d in docs])
    
    prompt = f"""You are DeepSeek Learn, a helpful AI assistant. 
Use the following context from the user's sources to answer their question. 
If you don't know the answer, just say so.

Context:
{context}

Question: {query}
Answer:"""
    
    return get_llm().invoke(prompt)

def generate_podcast_script(notebook_id: str) -> str:
    vectorstore = Chroma(
        collection_name=notebook_id, 
        embedding_function=get_embeddings(), 
        persist_directory=CHROMA_PATH
    )
    docs = vectorstore.similarity_search("summary of all content", k=10)
    context = "\n\n".join([d.page_content for d in docs])
    
    prompt = f"""Write a 2-minute engaging podcast script based on the following text. 
Include two hosts: Host A (curious) and Host B (expert). 
Make it conversational and easy to listen to. Do not include stage directions.

Text:
{context}

Script:"""
    
    return get_llm().invoke(prompt)

def delete_notebook(notebook_id: str):
    vectorstore = Chroma(
        collection_name=notebook_id,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_PATH
    )
    vectorstore.delete_collection()
