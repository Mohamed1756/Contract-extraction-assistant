# Security Policy

## Security Considerations

**Contract Extraction Assistant** is designed for local/self-hosted use. Follow these best practices to keep your environment safe:

1. **Local Data Processing**
   - PDFs and sensitive documents remain on your machine unless explicitly sent to an LLM API.
   - Only the extracted text prompts are transmitted to the API.

2. **API Key Management**
   - Keep your Mistral or other provider API keys secret.
   - Never commit `.env` files containing keys to public repositories.

3. **Dependencies & Updates**
   - Keep Python, Node.js, and all project dependencies up to date.
   - Apply security patches for Flask, PyMuPDF, React, Tailwind, and other libraries promptly.

4. **Self-Hosting Risks**
   - Do not expose the backend publicly without proper security measures (HTTPS, authentication, firewalls).
   - Avoid running the backend with root or elevated privileges.

5. **File Upload Handling**
   - Malicious PDFs could exploit vulnerabilities in PDF parsing libraries.
   - Always run the tool in a trusted environment and keep PyMuPDF up to date.

6. **Audit & Logging**
   - Enable logging for API calls and extraction timestamps, but avoid storing the actual contract content.
