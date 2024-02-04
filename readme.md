# Conscious Brand Sage

Conscious Brand Sage is a comprehensive Express.js application with OpenAI integration for generating brand stories and assisting with branding for regenerative, conscious businesses. This application includes file upload functionality, AI-powered brand storytelling, and more.

## Features

- **Brand Story Generation:** Generate compelling brand stories using AI, tailored to your business's unique characteristics.
- **OpenAI Integration:** Utilize OpenAI's GPT-4 model for natural language processing and content generation.
- **Regenerative Business Focus:** Receive advice and support aligned with sustainability and ethical principles.
- **Friendly and Conversational:** Get personalized, context-specific guidance in a friendly and approachable manner.

## Installation

1. Clone this repository. `git clone https://github.com/RaheesAhmed/brand-story-creator.git`
2. Install dependencies using `npm install`.
3. Create a `.env` file and set your OpenAI API key:`OPENAI_API_KEY=Your Api key`
4. Start the server using `npm start`.

## Usage

- Visit the web application in your browser.
- Upload relevant files for your branding process.
- Generate brand stories by providing business details through the web interface.

## API Endpoints

- `/generate-story`: POST endpoint to generate brand stories.

## Configuration

- The OpenAI API key should be set in the `.env` file.
- Additional configurations can be made in the `assistant.json` file.

## Dependencies

- Express.js
- CORS
- Body Parser
- fs (File System)
- OpenAI
- dotenv

## Credits

This project makes use of the OpenAI API for natural language processing and content generation.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
