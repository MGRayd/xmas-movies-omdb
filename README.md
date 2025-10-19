# Christmas Quiz App (React + Firebase)

A festive Christmas-themed quiz application with a public quiz interface and an admin panel to manage questions and view results.

## Features

- 🎄 Festive Christmas theme with snowfall animation
- 🎮 Interactive quiz with timed questions
- 🏆 Public leaderboard for players to compete
- 🔐 Admin panel to manage questions and view results
- 📱 Fully responsive design for all devices

## Quick Start

1. Install dependencies:
   ```
   npm i
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser at `http://localhost:5173`

## Admin Setup

1. Enable Google Authentication in your Firebase project:
   - Go to the Firebase console > Authentication > Sign-in method
   - Enable Google as a sign-in provider
   - Add your authorized domains

2. After signing in with Google, add the user to the `admins` collection in Firestore:
   - Create a document in the `admins` collection
   - Use the user's UID as the document ID
   - You can find the UID in the Firebase Authentication users list

## Firebase Configuration

This project uses Firebase for:
- Authentication (admin login)
- Firestore (storing questions and scores)
- Storage (storing question images)

### Security Rules

The project includes security rules for both Firestore and Storage:

- **Firestore Rules**: Control access to questions, scores, and admin data
- **Storage Rules**: Control access to uploaded question images

To deploy the rules:

**Option 1: Using Firebase CLI**
```
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

**Option 2: Manual deployment through Firebase Console**
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. For Firestore Rules:
   - Go to Firestore Database > Rules
   - Copy the contents of `firestore.rules` and paste them
   - Click "Publish"
4. For Storage Rules:
   - Go to Storage > Rules
   - Copy the contents of `storage.rules` and paste them
   - Click "Publish"

## Deploy

1. Build the project:
   ```
   npm run build
   ```

2. Deploy to Firebase:
   ```
   firebase deploy
   ```

## Project Structure

- `/src/pages` - Main application pages
- `/src/components` - Reusable components
- `/src/hooks` - Custom React hooks
- `/src/ui` - UI components and layout

## License

MIT
