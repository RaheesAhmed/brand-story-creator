# Conscious Brand Sage

Conscious Brand Sage is an advanced Express.js application integrated with OpenAI's GPT-4, designed to aid in the creation and development of brand stories, especially for businesses with a focus on sustainability and ethical practices. It offers AI-driven insights for crafting compelling narratives that resonate with a business's target audience.

## Key Features

**AI-Powered Brand Story Generation:** Leverages OpenAI's GPT-4 to generate unique and tailored brand stories.

**Regenerative Business Oriented:** Specifically designed for businesses committed to sustainability and ethical values.

**Customizable Assistant:** Ability to create or use an existing assistant for tailored interactions.

**RESTful API Endpoints:** Provides various endpoints for brand story generation and file handling.

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

`POST /generate-story:` Generate a brand story based on business details.
`GET /target-audiences:` Retrieve potential target audiences for a business.

## Technology Stack

`Backend:` Node.js with Express.js framework.
`AI Processing:` OpenAI GPT-4 model.
`Environment Variables:` dotenv for managing API keys and other configurations.

## File Structure

`app.js:` Main server file with route definitions and middleware configurations.
`assistant.json:` Stores details of the created OpenAI assistant.
`/public:` Contains static files for the frontend.
`/uploads:` Destination for file uploads.

## Credits

This project makes use of the OpenAI API for natural language processing and content generation.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
