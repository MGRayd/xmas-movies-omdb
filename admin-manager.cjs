// admin-manager.cjs
const admin = require('firebase-admin');
const readline = require('readline');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccount.json')),
  projectId: 'xmas-quiz-8c02e',
  storageBucket: 'xmas-quiz-8c02e.firebasestorage.app'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to mask UID for security
function maskUid(uid) {
  return uid.length > 10 
    ? `${uid.substring(0, 6)}...${uid.substring(uid.length - 4)}` 
    : uid;
}

// Helper function to mask email for privacy
function maskEmail(email) {
  if (!email) return '(No email)';
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const maskedUsername = username.length > 2 
    ? `${username.substring(0, 2)}${'*'.repeat(Math.min(username.length - 2, 5))}` 
    : username;
  
  const domainParts = domain.split('.');
  const tld = domainParts.pop();
  const domainName = domainParts.join('.');
  
  const maskedDomain = `${domainName.substring(0, 2)}${'*'.repeat(Math.min(domainName.length - 2, 3))}`;
  
  return `${maskedUsername}@${maskedDomain}.${tld}`;
}

// Function to list all users
async function listAllUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    
    console.log('\nAll users in the system:');
    listUsersResult.users.forEach((userRecord, index) => {
      console.log(`${index + 1}. User:`, {
        uid: maskUid(userRecord.uid),
        email: maskEmail(userRecord.email),
        displayName: userRecord.displayName || '(No display name)',
        isAdmin: userRecord.customClaims?.admin === true ? '✓' : '✗'
      });
    });
    
    console.log('\nTotal users:', listUsersResult.users.length);
    return listUsersResult.users;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

// Function to list only admin users
async function listAdminUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const adminUsers = listUsersResult.users.filter(user => user.customClaims?.admin === true);
    
    console.log('\nAdmin users:');
    if (adminUsers.length > 0) {
      adminUsers.forEach((userRecord, index) => {
        console.log(`${index + 1}. Admin:`, {
          uid: maskUid(userRecord.uid),
          email: maskEmail(userRecord.email),
          displayName: userRecord.displayName || '(No display name)'
        });
      });
    } else {
      console.log('No admin users found');
    }
    
    console.log(`\nFound ${adminUsers.length} admin users out of ${listUsersResult.users.length} total users`);
    return adminUsers;
  } catch (error) {
    console.error('Error listing admin users:', error);
    return [];
  }
}

// Function to add admin claim to a user
async function addAdminClaim(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, admin: true });
    console.log(`\nAdmin claim added to user: ${maskEmail(user.email)} (${maskUid(uid)})`);
    console.log('Updated custom claims:', { ...existing, admin: true });
    return true;
  } catch (error) {
    console.error('Error adding admin claim:', error);
    return false;
  }
}

// Function to remove admin claim from a user
async function removeAdminClaim(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    const existing = { ...user.customClaims } || {};
    delete existing.admin;
    await admin.auth().setCustomUserClaims(uid, existing);
    console.log(`\nAdmin claim removed from user: ${maskEmail(user.email)} (${maskUid(uid)})`);
    console.log('Updated custom claims:', existing);
    return true;
  } catch (error) {
    console.error('Error removing admin claim:', error);
    return false;
  }
}

// Function to prompt for user selection
function promptUserSelection(users) {
  return new Promise((resolve) => {
    rl.question('\nEnter the number of the user to modify (or 0 to cancel): ', (answer) => {
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < users.length) {
        resolve(users[index]);
      } else {
        resolve(null);
      }
    });
  });
}

// Main menu function
async function showMainMenu() {
  console.log('\n=== Admin Management Tool ===');
  console.log('1. List all users');
  console.log('2. List admin users');
  console.log('3. Add admin claim to a user');
  console.log('4. Remove admin claim from a user');
  console.log('5. Exit');
  
  rl.question('\nSelect an option (1-5): ', async (answer) => {
    switch (answer) {
      case '1':
        await listAllUsers();
        showMainMenu();
        break;
      case '2':
        await listAdminUsers();
        showMainMenu();
        break;
      case '3': {
        const users = await listAllUsers();
        const selectedUser = await promptUserSelection(users);
        if (selectedUser) {
          await addAdminClaim(selectedUser.uid);
        } else {
          console.log('Operation cancelled');
        }
        showMainMenu();
        break;
      }
      case '4': {
        const adminUsers = await listAdminUsers();
        const selectedUser = await promptUserSelection(adminUsers);
        if (selectedUser) {
          await removeAdminClaim(selectedUser.uid);
        } else {
          console.log('Operation cancelled');
        }
        showMainMenu();
        break;
      }
      case '5':
        console.log('Exiting...');
        rl.close();
        break;
      default:
        console.log('Invalid option. Please try again.');
        showMainMenu();
    }
  });
}

// Start the application
(async () => {
  console.log('Starting Admin Management Tool...');
  showMainMenu();
})();

// Handle cleanup when exiting
rl.on('close', () => {
  process.exit(0);
});
