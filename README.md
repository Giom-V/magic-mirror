<p align="center">
  <img src="public/face.png" alt="Project Face" width="200"/>
</p>

# Magic Mirror

This repository is a demonstration of what can be built with the Gemini Live API and the genmedia (e.g., Veo, Lyria, Imagen) models from the Gemini family. It is based on the [react-based starter app](https://github.com/google-gemini/live-api-web-console) and transforms it into an interactive, voice-controlled "Magic Mirror".

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

## Controls

### Keyboard Shortcuts

| Key      | Action                                                   |
| :------- | :------------------------------------------------------- |
| `Enter`  | Connect or disconnect from the live stream.              |
| `Space`  | Press to talk (or toggle mute if already connected).     |
| `i`      | Disguise yourself as a fantasy character.                |
| `Delete` | Remove the image disguise.                               |
| `c`      | Clear the image disguise.                                |
| `v`      | Play or pause the talking animation.                     |
| `d`      | Show or hide the developer side panel.                   |
| `m`      | Toggle background music.                                 |

### UI Controls

| Icon | Action |
| --- | --- |
| `mic` / `mic_off` | Mute/Unmute the microphone. |
| `play_arrow` / `pause` | Connect/Disconnect from the live stream. |
| `present_to_all` / `cancel_presentation` | Start/Stop screen sharing. |
| `videocam` / `videocam_off` | Turn on/off the camera. |

## What you can do with the Magic Mirror

The Magic Mirror is voice-controlled and designed to stay in character. Here are some things you can try:

*   **Illustrate your stories:**
    *   "Draw a picture of a brave knight."
    *   "Generate an image of a mysterious forest."

*   **Disguise yourself:**
    *   "Make me look like a wizard."
    *   "I want to be a pirate."
    *   (You can also use the `i` key to apply a generic fantasy disguise)

*   **Edit your images:**
    *   "Change the background to a castle."
    *   "Make my hair blue."

*   **Play music:**
    *   "Play some fantasy music."
    *   "I want to hear some epic adventure music."
    *   "Stop the music."

## Project Structure

*   `public/`: Contains the main HTML file and static assets like images and fonts.
*   `src/`: The heart of the application, containing all the React components, hooks, and business logic.
    *   `components/`: Reusable React components that make up the UI.
    *   `contexts/`: React context providers for managing global state.
    *   `hooks/`: Custom React hooks for encapsulating and reusing stateful logic.
    *   `lib/`: Utility functions and helper code.
    *   `tools/`: Implementations of the functions ("tools") that the Gemini model can call, such as `disguiseCameraImage` and `playMusic`.
*   `src/config.json`: A configuration file for the application, allowing you to tweak prompts and other settings.

## Configuration

The `src/config.json` file allows you to customize the behavior of the Magic Mirror. Here are some of the key options:

*   `liveModel`: The Gemini model used for the main chat and voice interaction.
*   `imageEditModel`: The Gemini model used for generating and editing images.
*   `disguisePromptTemplate`: The prompt template used when you ask the mirror to disguise you.
*   `editImagePromptTemplate`: The prompt template used when you ask the mirror to edit an image.
*   `musicPromptTemplate`: The prompt template used to generate music prompts for Lyria.
*   `systemInstructions`: The core instructions for the Magic Mirror's persona and behavior. This is where you can change how the mirror responds, what it can do, and how it interacts with the user. There are different instructions for different languages (e.g., `en-US`, `fr-FR`).
*   `autoStart`: Allows the application to automatically connect and start the camera on load.
*   `tools`: This section defines the tools available to the Gemini model, including their names, descriptions, and parameters. You can add, remove, or modify tools here to change the Magic Mirror's capabilities.

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
