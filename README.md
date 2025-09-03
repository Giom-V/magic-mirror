<p align="center">
  <img src="public/face.png" alt="Project Face" width="200"/>
</p>

# Live API - Web Console

This repository contains a React-based starter app for using the [Live API](<[https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)>) over a websocket. It provides a real-time, multimodal experience that allows you to interact with a generative AI using your voice, camera, and screen.

## How to Run

To get started, you'll need a free Gemini API key.

1.  **Get an API Key:** Create your key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

2.  **Set up your environment:** Create a `.env` file in the root of the project and add your API key like this:

    ```
    REACT_APP_GEMINI_API_KEY=YOUR_API_KEY
    ```

3.  **Install dependencies and run:** Open your terminal and run the following commands:

    ```bash
    npm install
    npm start
    ```

The application will be available at `http://localhost:3000`.

## Keyboard Shortcuts

| Key      | Action                                                   |
| :------- | :------------------------------------------------------- |
| `Enter`  | Connect or disconnect from the live stream.              |
| `Space`  | Press to talk (or toggle mute if already connected).     |
| `i`      | Apply a "fantasy character" disguise to the camera image.|
| `Delete` | Remove the image disguise.                               |
| `v`      | Play or pause the talking animation.                     |
| `d`      | Show or hide the developer side panel.                   |
| `m`      | Toggle background music.                                 |

## Things You Can Try

This application is a playground for multimodal interactions. Here are a few examples of things you can ask the assistant:

*   **Live Explanations:** Share your screen and ask questions about what's on it. For example, open a code file and ask, "Can you explain this function to me?"
*   **Creative Writing:** Turn on the "fantasy character" disguise (`i` key) and ask the assistant to help you write a story about that character.
*   **Interactive Storytelling:** Start with a prompt like, "Let's create a story together. I'll start..." and build a narrative with the AI.
*   **Music Fun:** Ask the assistant to "Play some music" and see what happens.

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

---

_This is an experiment showcasing the Live API, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._
