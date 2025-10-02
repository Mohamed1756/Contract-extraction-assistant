import os
from dotenv import load_dotenv
from mistralai import Mistral, SDKError

load_dotenv()

def check_mistral_connection():
    """
    Checks the connection to the Mistral API by listing available models.
    """
    try:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            print("MISTRAL_API_KEY environment variable not set.")
            return

        client = Mistral(api_key=api_key)
        
        print("Attempting to connect to Mistral AI...")
        models_response = client.models.list()
        
        print("Successfully connected to Mistral AI!")
        print(f"Found {len(models_response.data)} available models.")
        # To see the models, uncomment the following lines:
        # print("Available models:")
        # for model in models_response.data:
        #     print(f" - {model.id}")

    except SDKError as e:
        print(f"Failed to connect to Mistral AI: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    check_mistral_connection()
