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

**Be aware that the Image generation model doesn't have a free tier, so you'll pay 0.039$ per image the mirror generates!**

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

*   **Tell stories:**
    *   "Tell me a story about a brave knight."
    *   "Let's write a story together."

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
