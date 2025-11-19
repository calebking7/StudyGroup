// Main app JavaScript (extracted from index.html)
// --- CONFIG: prefer values from optional `supabase-config.js` (window.SUPABASE_CONFIG) ---
// If that file is not present, the placeholders below are used and the app will not attempt
// network requests until you replace them or create the config file.
const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.SUPABASE_URL) ? window.SUPABASE_CONFIG.SUPABASE_URL : 'https://supabase.placeholder.com';
const SUPABASE_ANON_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.SUPABASE_ANON_KEY) ? window.SUPABASE_CONFIG.SUPABASE_ANON_KEY : 'pk.placeholder';
// ---------------------------------------------------------------------------------------

// Supabase client instance
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Application State
const state = {
	user: null,
	currentView: 'auth', // 'auth', 'groups', 'chat'
	currentRoom: null, // { id, name, description }
	selectedFile: null,
	realtimeChannel: null,
	isSignUpMode: false,
};

// UI Elements
const views = {
	auth: document.getElementById('auth-view'),
	groups: document.getElementById('groups-view'),
	chat: document.getElementById('chat-view'),
	profile: document.getElementById('profile-view'),
	settings: document.getElementById('settings-view'),
	'profile-complete': document.getElementById('profile-complete-view'),
	'profile-details': document.getElementById('profile-details-view'),
};
const loadingOverlay = document.getElementById('loading-overlay');
const logoutButton = document.getElementById('logout-button');
const userDisplayEmail = document.getElementById('user-display-email');
    
// Auth Elements
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitButton = document.getElementById('auth-submit-button');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode');
const authMessage = document.getElementById('auth-message');

// Groups Elements
const groupsList = document.getElementById('groups-list');
const groupSearchInput = document.getElementById('group-search');
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const closeGroupModalBtn = document.getElementById('close-group-modal');
const groupCreationForm = document.getElementById('group-creation-form');
const groupNameInput = document.getElementById('group-name-input');
const groupDescInput = document.getElementById('group-desc-input');
const groupIdInput = document.getElementById('group-id-input');

// Bottom nav & profile elements
const navGroups = document.getElementById('nav-groups');
const navSettings = document.getElementById('nav-settings');
const navProfile = document.getElementById('nav-profile');

const profileView = document.getElementById('profile-view');
const profileForm = document.getElementById('profile-form');
const profileFullname = document.getElementById('profile-fullname');
const profileMatric = document.getElementById('profile-matric');
const profilePhone = document.getElementById('profile-phone');
const profileEmail = document.getElementById('profile-email');
const saveProfileBtn = document.getElementById('save-profile');
const closeProfileBtn = document.getElementById('close-profile');

const profileCompleteView = document.getElementById('profile-complete-view');
const profileCompleteForm = document.getElementById('profile-complete-form');
const completeFullname = document.getElementById('complete-fullname');
const completeMatric = document.getElementById('complete-matric');
const completePhone = document.getElementById('complete-phone');

// legacy modal removed; keep element refs for details display text
// const profileDetailsModal = document.getElementById('profile-details-modal');
const detailsName = document.getElementById('details-name');
const detailsMatric = document.getElementById('details-matric');
const detailsPhone = document.getElementById('details-phone');
const detailsEmail = document.getElementById('details-email');
const closeDetailsBtn = document.getElementById('close-details');

// Simple in-memory cache for profiles
const profileCache = {};

// Settings view elements
const settingsView = document.getElementById('settings-view');
const settingsBackBtn = document.getElementById('settings-back');
const settingsSignoutBtn = document.getElementById('settings-signout');
const settingDarkModeEl = document.getElementById('setting-dark-mode');
const profileBackBtn = document.getElementById('profile-back');

// Dark mode persistence helpers
function applyDarkMode(enabled) {
	try {
		if (enabled) document.body.classList.add('dark-mode');
		else document.body.classList.remove('dark-mode');
	} catch (e) {
		console.warn('Failed to apply dark mode', e);
	}
}

function loadDarkModePreference() {
	try {
		const raw = localStorage.getItem('darkMode');
		const enabled = raw === '1' || raw === 'true';
		if (settingDarkModeEl) settingDarkModeEl.checked = enabled;
		applyDarkMode(enabled);
	} catch (e) {
		console.warn('Failed to load dark mode preference', e);
	}
}

function saveDarkModePreference(enabled) {
	try {
		localStorage.setItem('darkMode', enabled ? '1' : '0');
	} catch (e) {
		console.warn('Failed to save dark mode preference', e);
	}
}

// Chat Elements
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const backToGroupsButton = document.getElementById('back-to-groups');
const roomNameHeader = document.getElementById('room-name');
const roomDescHeader = document.getElementById('room-description');
const fileInput = document.getElementById('file-input');
const fileUploadButton = document.getElementById('file-upload-button');
const filePreviewContainer = document.getElementById('file-preview-container');
const fileNameDisplay = document.getElementById('file-name-display');
const clearFileButton = document.getElementById('clear-file-button');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('file-upload-progress');

/** --- Utility Functions --- **/

function createClient(url, key) {
	const isMissing = !url || !key || !url.trim() || !key.trim();
	const isPlaceholder = (url && url.includes('placeholder')) || (key && key.includes('placeholder'));
	if (isMissing || isPlaceholder) {
		console.error("FATAL WARNING: Supabase URL or ANON key are missing or placeholders. Provide valid values in supabase-config.js or index.html before using the app.");
	}
	return window.supabase.createClient(url, key);
}
        
function formatTimestamp(isoString) {
	if (!isoString) return 'Just now';
	return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showMessage(element, message, isError = false) {
	element.textContent = message;
	element.className = `p-3 mb-4 rounded-lg text-sm ${isError ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`;
	element.classList.remove('hidden');
}
        
function hideMessage(element) {
	element.classList.add('hidden');
	element.textContent = '';
}

function scrollToBottom() {
	requestAnimationFrame(() => {
		chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
	});
}

/** --- View Management --- **/

function changeView(viewName) {
	Object.values(views).forEach(v => v.classList.add('hidden'));
	views[viewName].classList.remove('hidden');
	state.currentView = viewName;
    
	if (viewName === 'groups') {
		fetchGroups();
	}

	// Hide bottom nav while in chat view to avoid overlap
	const bottomNav = document.getElementById('bottom-nav');
	if (bottomNav) {
		if (viewName === 'chat') bottomNav.classList.add('hidden');
		else bottomNav.classList.remove('hidden');
	}

	// Hide the static body background when in chat view to keep chat look clean
	if (viewName === 'chat') document.body.classList.add('hide-static-bg');
	else document.body.classList.remove('hide-static-bg');
	// Clear chat admin controls when not in chat view
	if (viewName !== 'chat') {
		const chatAdminControls = document.getElementById('chat-admin-controls');
		const roomAdminArea = document.getElementById('room-admin-area');
		if (chatAdminControls) chatAdminControls.innerHTML = '';
		if (roomAdminArea) roomAdminArea.innerHTML = '';
	}
}

// Nav handlers
if (navGroups) navGroups.addEventListener('click', () => changeView('groups'));
if (navSettings) navSettings.addEventListener('click', () => changeView('settings'));
if (navProfile) navProfile.addEventListener('click', () => openProfileView());

// Settings view handlers
if (settingsBackBtn) settingsBackBtn.addEventListener('click', () => changeView('groups'));
if (settingsSignoutBtn) settingsSignoutBtn.addEventListener('click', handleLogout);
if (profileBackBtn) profileBackBtn.addEventListener('click', () => changeView('groups'));

// Wire dark mode toggle (persisted)
if (settingDarkModeEl) {
	settingDarkModeEl.addEventListener('change', (e) => {
		const enabled = !!e.target.checked;
		applyDarkMode(enabled);
		saveDarkModePreference(enabled);
	});
}

// Load preference immediately
loadDarkModePreference();

function showLoading(show) {
	loadingOverlay.classList.toggle('hidden', !show);
}

/** --- Authentication --- **/

function handleAuthToggle() {
	state.isSignUpMode = !state.isSignUpMode;
	authSubmitButton.textContent = state.isSignUpMode ? 'Sign Up' : 'Sign In';
	toggleAuthModeButton.textContent = state.isSignUpMode ? 'Sign In' : 'Sign Up';
	authForm.reset();
	hideMessage(authMessage);
}

async function handleAuthSubmit(e) {
	e.preventDefault();
	hideMessage(authMessage);
	const email = authEmailInput.value;
	const password = authPasswordInput.value;
	showLoading(true);

	try {
		let response;
		if (state.isSignUpMode) {
			response = await supabase.auth.signUp({ email, password });
			if (response.error) throw response.error;
			showMessage(authMessage, "Sign up successful! Please check your email to confirm.", false);
		} else {
			response = await supabase.auth.signInWithPassword({ email, password });
			if (response.error) throw response.error;
			// On successful sign-in, the auth listener will handle navigation
		}
	} catch (error) {
		console.error("Auth Error:", error);
		showMessage(authMessage, `Auth failed: ${error.message || error}`, true);
	} finally {
		showLoading(false);
	}
}

async function handleLogout() {
	if (state.realtimeChannel) {
		await supabase.removeChannel(state.realtimeChannel);
		state.realtimeChannel = null;
	}
	showLoading(true);
		if (!confirm('Sign out of Study Hub?')) return;
		if (state.realtimeChannel) {
			await supabase.removeChannel(state.realtimeChannel);
			state.realtimeChannel = null;
		}
		showLoading(true);
		await supabase.auth.signOut();
		// The auth listener will handle the rest
}

function setupAuthListener() {
	supabase.auth.onAuthStateChange((event, session) => {
		showLoading(false);
		if (session) {
			state.user = session.user;
			// Try to show profile name if available
			ensureProfileCache(state.user.id).then(profile => {
				userDisplayEmail.textContent = (profile && profile.full_name) ? profile.full_name : state.user.email;
			}).catch(() => { userDisplayEmail.textContent = state.user.email; });
			if (logoutButton) logoutButton.classList.remove('hidden');
			changeView('groups');
			// After sign-up or first sign-in, ensure profile completeness
			ensureProfileCompleteness();
		} else {
			state.user = null;
			state.currentRoom = null;
			userDisplayEmail.textContent = '';
			if (logoutButton) logoutButton.classList.add('hidden');
			changeView('auth');
		}
	});
}

/** --- Group Management --- **/

async function fetchGroups(searchTerm = '') {
	groupsList.innerHTML = '<p class="text-center text-gray-500 py-4">Loading groups...</p>';
	let query = supabase.from('groups').select('*');

	if (searchTerm) {
		query = query.ilike('name', `%${searchTerm}%`);
	}

	const { data, error } = await query.order('created_at', { ascending: false });

	if (error) {
		console.error("Error fetching groups:", error);
		// PGRST205: PostgREST returns this when table is not found in schema cache
		if (error.code === 'PGRST205' || (error.message && /Could not find the table/i.test(error.message))) {
			groupsList.innerHTML = `
				<div class="p-4 text-red-400">
					<p class="font-semibold">Database table missing: <code>public.groups</code></p>
					<p class="mt-2">Create the table in your Supabase project's SQL editor. Example SQL:</p>
					<pre class="mt-2 p-3 bg-gray-800 rounded text-sm overflow-auto">-- Simple groups table
CREATE TABLE public.groups (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
</pre>
					<p class="mt-2">After creating the table, reload this page.</p>
				</div>
			`;
		} else {
			groupsList.innerHTML = `<p class="text-center text-red-400 py-4">Error loading groups: ${error.message || error}</p>`;
		}
		return;
	}

	renderGroups(data || []);
}

function renderGroups(groups) {
	groupsList.innerHTML = '';
	if (groups.length === 0) {
		// If the user created a group but it doesn't appear here, it's commonly
		// caused by Row-Level Security (RLS) policies blocking SELECT for the
		// anon/public role. Show a helpful hint so the developer can add policies.
		groupsList.innerHTML = `
			<div class="text-center text-gray-500 py-4">
				<p>No groups found. Be the first to create one!</p>
				${state.user ? `<p class="mt-2 text-sm text-yellow-300">If you created a group but it isn't visible to other users, your Supabase table may have Row-Level Security (RLS) enabled. See <code>README.md</code> for example SQL policies to allow read access.</p>` : ''}
			</div>
		`;
		return;
	}

	// Single-pass render (avoid duplicates) and attach listeners
	groups.forEach(group => {
		const isAdmin = state.user && (String(state.user.id) === String(group.created_by));
		const card = document.createElement('div');
		card.className = 'bg-supabase-light p-4 rounded-xl border border-gray-200 hover:border-app-green transition duration-150';
		card.innerHTML = `
			<div class="flex justify-between items-start">
				<div>
					<h4 class="text-lg font-semibold text-supabase-green inline">${group.name}</h4>
					${isAdmin ? '<span class="group-admin-badge">Admin</span>' : ''}
					<p class="text-sm text-gray-400 mt-1">${group.description || ''}</p>
				</div>
				<div class="ml-3">
					<button data-group-id="${group.id}" class="join-group-btn text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg">Join</button>
					${isAdmin ? `<button data-group-id-edit="${group.id}" class="edit-group-btn ml-2 text-sm bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">Edit</button>
								  <button data-group-id-delete="${group.id}" class="delete-group-btn ml-2 text-sm bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Del</button>` : ''}
				</div>
			</div>
		`;
		groupsList.appendChild(card);
	});

	// Attach join and admin listeners dynamically
	document.querySelectorAll('.join-group-btn').forEach(button => {
		button.addEventListener('click', (e) => {
			const id = e.target.dataset.groupId;
			// find group object quickly
			const grpEl = groups.find(g => String(g.id) === String(id));
			if (grpEl) joinChatRoom(grpEl);
		});
	});
	document.querySelectorAll('.edit-group-btn').forEach(btn => btn.addEventListener('click', (e) => {
		const id = e.target.dataset.groupIdEdit;
		const grp = groups.find(g => String(g.id) === String(id));
		if (!grp) return;
		// open create modal in edit mode
		groupIdInput.value = grp.id;
		groupNameInput.value = grp.name;
		groupDescInput.value = grp.description || '';
		createGroupModal.classList.remove('hidden');
	}));
	document.querySelectorAll('.delete-group-btn').forEach(btn => btn.addEventListener('click', (e) => {
		const id = e.target.dataset.groupIdDelete;
		if (!confirm('Delete this group? This will remove all messages.')) return;
		deleteGroup(id).then(() => fetchGroups());
	}));
}

async function deleteGroup(groupId) {
	try {
		const { error } = await supabase.from('groups').delete().eq('id', groupId);
		if (error) throw error;
		return true;
	} catch (err) {
		console.error('Error deleting group:', err);
		alert('Failed to delete group: ' + (err.message || err));
		return false;
	}
}

// Group Search Debounce
let searchTimeout;
function handleGroupSearch() {
	clearTimeout(searchTimeout);
	searchTimeout = setTimeout(() => {
		fetchGroups(groupSearchInput.value.trim());
	}, 300);
}

// Group Creation Modal and Submission
createGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('hidden'));
closeGroupModalBtn.addEventListener('click', () => createGroupModal.classList.add('hidden'));

async function handleGroupCreation(e) {
	e.preventDefault();
	const name = groupNameInput.value.trim();
	const description = groupDescInput.value.trim();
	if (!name || !description) return;

	createGroupModal.classList.add('hidden');
	showLoading(true);

	// If groupIdInput present, update instead of insert
	const gid = groupIdInput && groupIdInput.value ? groupIdInput.value : null;
	try {
		if (gid) {
			const { data, error } = await supabase.from('groups').update({ name, description }).eq('id', gid).select().single();
			if (error) throw error;
			alert(`Group "${data.name}" updated.`);
		} else {
			const { error } = await supabase.from('groups').insert({ name, description, created_by: state.user.id });
			if (error) throw error;
			alert(`Group "${name}" created successfully!`);
		}
	} catch (err) {
		console.error('Error creating/updating group:', err);
		alert('Failed to save group: ' + (err.message || err));
	} finally {
		showLoading(false);
		groupCreationForm.reset();
		if (groupIdInput) groupIdInput.value = '';
		fetchGroups();
	}
}

/** --- Chat Room and Realtime --- **/

async function joinChatRoom(room) {
	state.currentRoom = room;
	roomNameHeader.textContent = room.name;
	roomDescHeader.textContent = room.description;
	changeView('chat');
    
	// Clear old channel if exists
	if (state.realtimeChannel) {
		await supabase.removeChannel(state.realtimeChannel);
	}
	chatMessagesContainer.innerHTML = '<p class="text-center text-gray-500 my-4">Loading messages...</p>';
    
	// Fetch initial messages
	await fetchMessages();

	// Set up Realtime listener
	state.realtimeChannel = supabase.channel(`group_${room.id}`)
		.on('postgres_changes', {
			event: 'INSERT',
			schema: 'public',
			table: 'messages',
			filter: `group_id=eq.${room.id}`
		}, (payload) => {
			// Avoid duplicate rendering if we already rendered the inserted row locally
			if (!document.getElementById(`message-${payload.new.id}`)) {
				renderMessage(payload.new);
				scrollToBottom();
			}
		})
		.on('postgres_changes', {
			event: 'UPDATE',
			schema: 'public',
			table: 'messages',
			filter: `group_id=eq.${room.id}`
		}, (payload) => {
			handleRemoteUpdateMessage(payload.new);
		})
		.on('postgres_changes', {
			event: 'DELETE',
			schema: 'public',
			table: 'messages',
			filter: `group_id=eq.${room.id}`
		}, (payload) => {
			handleRemoteDeleteMessage(payload.old.id);
		})
		.subscribe();

	// Render admin badge and controls for this chat (for all users show who is admin; admin gets edit/delete)
	renderChatAdminControls(room);
}

function renderChatAdminControls(room) {
	const chatAdminControls = document.getElementById('chat-admin-controls');
	const roomAdminArea = document.getElementById('room-admin-area');
	if (chatAdminControls) chatAdminControls.innerHTML = '';
	if (roomAdminArea) roomAdminArea.innerHTML = '';

	if (!room) return;

	// Always show who the admin/owner is (if available)
	ensureProfileCache(room.created_by).then(profile => {
		const display = (profile && profile.full_name) ? profile.full_name : (room.created_by ? 'Group owner' : '—');
		if (roomAdminArea) {
			const el = document.createElement('div');
			el.className = 'text-xs text-gray-400';
			el.textContent = `Admin: ${display}`;
			roomAdminArea.appendChild(el);
		}
	}).catch(() => {
		if (roomAdminArea) roomAdminArea.textContent = 'Admin: —';
	});

	// If current user is admin, show menu with edit/delete
	const isAdmin = state.user && room && String(state.user.id) === String(room.created_by);
	if (!isAdmin) return;

	if (!chatAdminControls) return;
	// menu button
	const menuBtn = document.createElement('button');
	menuBtn.type = 'button';
	menuBtn.className = 'message-options-button p-1 rounded hover:bg-gray-700';
	menuBtn.title = 'Group options';
	menuBtn.innerHTML = '&#x22EE;';

	const menu = document.createElement('div');
	menu.className = 'message-menu hidden mt-8 w-36 rounded bg-supabase-light border border-gray-200 shadow-lg z-50';

	const editItem = document.createElement('button');
	editItem.type = 'button';
	editItem.className = 'block w-full text-left px-3 py-2 text-sm hover:bg-gray-800';
	editItem.textContent = 'Edit Group';
	editItem.addEventListener('click', (ev) => {
		ev.stopPropagation();
		// open create modal in edit mode
		groupIdInput.value = room.id;
		groupNameInput.value = room.name || '';
		groupDescInput.value = room.description || '';
		createGroupModal.classList.remove('hidden');
		menu.classList.add('hidden');
	});

	const delItem = document.createElement('button');
	delItem.type = 'button';
	delItem.className = 'block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 text-red-400';
	delItem.textContent = 'Delete Group';
	delItem.addEventListener('click', async (ev) => {
		ev.stopPropagation();
		if (!confirm('Delete this group? This will remove all messages.')) return;
		const ok = await deleteGroup(room.id);
		if (ok) changeView('groups');
	});

	menu.appendChild(editItem);
	menu.appendChild(delItem);

	menuBtn.addEventListener('click', (ev) => {
		ev.stopPropagation();
		if (menu.classList.contains('hidden')) {
			menu.classList.remove('hidden');
		} else {
			menu.classList.add('hidden');
		}
	});

	// Close menu when clicking outside
	document.addEventListener('click', (e) => {
		if (!menu.contains(e.target) && e.target !== menuBtn) {
			menu.classList.add('hidden');
		}
	});

	chatAdminControls.appendChild(menuBtn);
	chatAdminControls.appendChild(menu);
}

async function fetchMessages() {
	const { data, error } = await supabase.from('messages')
		.select('*')
		.eq('group_id', state.currentRoom.id)
		.order('created_at', { ascending: true });

	if (error) {
		console.error("Error fetching messages:", error);
		// PGRST205 or similar indicates the messages table doesn't exist or isn't exposed
		if (error.code === 'PGRST205' || (error.message && /Could not find the table/i.test(error.message))) {
			chatMessagesContainer.innerHTML = `
				<div class="p-4 text-red-400">
					<p class="font-semibold">Database table missing: <code>public.messages</code></p>
					<p class="mt-2">Create the table in your Supabase project's SQL editor. Example SQL:</p>
					<pre class="mt-2 p-3 bg-gray-800 rounded text-sm overflow-auto">-- Simple messages table
CREATE TABLE public.messages (
  id serial PRIMARY KEY,
  group_id integer REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid,
  sender_name text,
  content text,
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now()
);
</pre>
					<p class="mt-2">Also ensure Row-Level Security (RLS) policies allow SELECT for the anon (or authenticated) role. See <code>README.md</code> for policy examples.</p>
				</div>
			`;
		} else {
			chatMessagesContainer.innerHTML = `<p class="text-center text-red-400 my-4">Error loading chat: ${error.message || error}</p>`;
		}
		return;
	}

	chatMessagesContainer.innerHTML = '';
	(data || []).forEach(renderMessage);
	scrollToBottom();
}

function renderMessage(message) {
	// Avoid rendering duplicates if message already exists in DOM
	if (!message || !message.id) return;
	if (document.getElementById(`message-${message.id}`)) return;
	const isMine = message.user_id === state.user.id;
	const senderName = message.sender_name || 'Guest';

	const messageDiv = document.createElement('div');
	messageDiv.id = `message-${message.id}`;
	messageDiv.className = `flex ${isMine ? 'justify-end' : 'justify-start'}`;

	const bubble = document.createElement('div');
	bubble.className = `max-w-xs md:max-w-md p-3 rounded-xl shadow-md space-y-1 message-bubble ${isMine ? 'message-mine' : 'message-other'}`;

	// Sender Name (clickable to view profile)
	const senderSpan = document.createElement('button');
	senderSpan.type = 'button';
	senderSpan.className = `block font-bold text-xs ${isMine ? 'text-emerald-100' : 'text-supabase-green'} hover:underline`;
	senderSpan.style.background = 'transparent';
	// Resolve display name from profile cache if possible
	const profile = profileCache[message.user_id];
	const displayName = (profile && profile.full_name) ? profile.full_name : (message.sender_name || 'Guest');
	senderSpan.textContent = isMine ? 'You' : displayName;
	// If we don't have a cached profile, try to fetch it and update the UI when available
	if (!profile && message.user_id) {
		ensureProfileCache(message.user_id).then(p => {
			if (p && p.full_name) {
				senderSpan.textContent = isMine ? 'You' : p.full_name;
			}
		}).catch(() => {});
	}
	senderSpan.title = 'View profile';
	senderSpan.addEventListener('click', (ev) => { ev.stopPropagation(); openProfileDetails(message.user_id); });
	bubble.appendChild(senderSpan);

	// File Content
	if (message.file_url && message.file_name) {
		const fileDiv = document.createElement('div');
		fileDiv.className = 'my-1 border-t border-gray-600 pt-1';
        
		// Simple check for image display
		if (message.file_name.match(/\.(jpeg|jpg|png|gif)$/i)) {
			const img = document.createElement('img');
			img.src = message.file_url;
			img.alt = message.file_name;
			img.className = 'max-w-full h-auto max-h-32 rounded-lg object-cover shadow-md mb-1';
			img.onerror = function() { this.style.display = 'none'; }; 
			fileDiv.appendChild(img);
		}
        
		// Display file link and download button
		const fileLinkWrap = document.createElement('div');
		fileLinkWrap.className = 'flex items-center space-x-2';

		const fileLink = document.createElement('a');
		fileLink.href = message.file_url;
		fileLink.target = '_blank';
		fileLink.rel = 'noopener noreferrer';
		fileLink.className = `flex items-center text-sm font-semibold hover:underline ${isMine ? 'text-white' : 'text-supabase-green'}`;
		fileLink.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
			${message.file_name}
		`;

		// View button (opens fullscreen preview)
		const viewBtn = document.createElement('button');
		viewBtn.type = 'button';
		viewBtn.className = 'ml-1 text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800';
		viewBtn.textContent = 'View';
		viewBtn.addEventListener('click', (ev) => {
			ev.stopPropagation();
			openFileViewerForMessage(message);
		});

		// Download button (uses fetch->blob to force download when possible)
		const dlBtn = document.createElement('button');
		dlBtn.type = 'button';
		dlBtn.className = 'ml-1 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800';
		dlBtn.textContent = 'Download';
		dlBtn.addEventListener('click', (ev) => {
			ev.stopPropagation();
			downloadFileForMessage(message);
		});

		fileLinkWrap.appendChild(fileLink);
		fileLinkWrap.appendChild(viewBtn);
		fileLinkWrap.appendChild(dlBtn);
		fileDiv.appendChild(fileLinkWrap);
		bubble.appendChild(fileDiv);
	}

	// Message text (wrap in a container so we can swap to edit mode)
	const textContainer = document.createElement('div');
	textContainer.className = 'message-text-container';
	if (message.content) {
		const textP = document.createElement('p');
		textP.className = 'text-sm message-content';
		textP.textContent = message.content;
		textContainer.appendChild(textP);
	}
	bubble.appendChild(textContainer);

	// Overflow menu (three-dot) for messages owned by the current user
	if (isMine) {
		// Make bubble relative so the menu can be absolutely positioned
		bubble.style.position = 'relative';

		const menuBtn = document.createElement('button');
		menuBtn.type = 'button';
		menuBtn.className = 'message-options-button absolute top-2 right-2 p-1 rounded hover:bg-gray-700';
		menuBtn.setAttribute('aria-haspopup', 'true');
		menuBtn.setAttribute('aria-expanded', 'false');
		menuBtn.title = 'Message options';
		menuBtn.innerHTML = '<span class="sr-only">Options</span>&#x22EE;'; // vertical ellipsis

		const menu = document.createElement('div');
		menu.className = 'message-menu hidden absolute right-2 mt-8 w-28 rounded bg-supabase-light border border-gray-200 shadow-lg z-50';

		const editItem = document.createElement('button');
		editItem.type = 'button';
		editItem.className = 'message-menu-item block w-full text-left px-3 py-2 text-sm hover:bg-gray-800';
		editItem.textContent = 'Edit';
		editItem.addEventListener('click', (ev) => { ev.stopPropagation(); closeAllMessageMenus(); enableMessageEdit(message.id); });

		const delItem = document.createElement('button');
		delItem.type = 'button';
		delItem.className = 'message-menu-item block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 text-red-400';
		delItem.textContent = 'Delete';
		delItem.addEventListener('click', (ev) => { ev.stopPropagation(); closeAllMessageMenus(); deleteMessage(message.id); });

		menu.appendChild(editItem);
		menu.appendChild(delItem);

		menuBtn.addEventListener('click', (ev) => {
			ev.stopPropagation();
			toggleMessageMenu(message.id);
		});

		// Attach identifiers so we can find/close menus later
		menuBtn.dataset.messageId = message.id;
		menu.dataset.messageId = message.id;

		bubble.appendChild(menuBtn);
		bubble.appendChild(menu);
	}

	// Timestamp and edited indicator
	const timeWrap = document.createElement('div');
	timeWrap.className = 'flex items-center justify-between';
	const timeSpan = document.createElement('span');
	timeSpan.className = `block mt-1 text-xs message-timestamp ${isMine ? 'text-emerald-200' : 'text-gray-400'} text-opacity-75 ${isMine ? 'text-right' : 'text-left'}`;
	timeSpan.textContent = formatTimestamp(message.created_at);
	timeWrap.appendChild(timeSpan);
	// Show edited tag if message.updated_at differs
	if (message.updated_at && message.updated_at !== message.created_at) {
		const editedSpan = document.createElement('span');
		editedSpan.className = 'message-edited';
		editedSpan.textContent = '(edited)';
		timeWrap.appendChild(editedSpan);
	}
	bubble.appendChild(timeWrap);

	messageDiv.appendChild(bubble);
	chatMessagesContainer.appendChild(messageDiv);
}

// --- Message Edit/Delete Helpers ---

function enableMessageEdit(messageId) {
	const el = document.getElementById(`message-${messageId}`);
	if (!el) return;
	const contentP = el.querySelector('.message-content');
	const textContainer = el.querySelector('.message-text-container');
	const current = contentP ? contentP.textContent : '';

	// Replace with textarea + save/cancel
	textContainer.innerHTML = '';
	const ta = document.createElement('textarea');
	ta.className = 'w-full p-2 rounded bg-supabase-dark text-supabase-text';
	ta.value = current;
	ta.rows = 3;

	const btnRow = document.createElement('div');
	btnRow.className = 'flex space-x-2 mt-2';

	const saveBtn = document.createElement('button');
	saveBtn.type = 'button';
	saveBtn.className = 'bg-supabase-green text-white px-3 py-1 rounded';
	saveBtn.textContent = 'Save';
	saveBtn.addEventListener('click', () => saveEditedMessage(messageId, ta.value));

	const cancelBtn = document.createElement('button');
	cancelBtn.type = 'button';
	cancelBtn.className = 'bg-gray-600 text-white px-3 py-1 rounded';
	cancelBtn.textContent = 'Cancel';
	cancelBtn.addEventListener('click', () => cancelMessageEdit(messageId, current));

	btnRow.appendChild(saveBtn);
	btnRow.appendChild(cancelBtn);
	textContainer.appendChild(ta);
	textContainer.appendChild(btnRow);
}

async function saveEditedMessage(messageId, newContent) {
	try {
		const { data, error } = await supabase.from('messages').update({ content: newContent }).eq('id', messageId).select().single();
		if (error) throw error;
		// Update DOM
		const el = document.getElementById(`message-${messageId}`);
		if (!el) return;
		const textContainer = el.querySelector('.message-text-container');
		textContainer.innerHTML = '';
		const p = document.createElement('p');
		p.className = 'text-sm message-content';
		p.textContent = data.content;
		textContainer.appendChild(p);
		// Update timestamp
		const ts = el.querySelector('.message-timestamp');
		if (ts) ts.textContent = formatTimestamp(data.created_at || data.updated_at || new Date().toISOString());
	} catch (err) {
		console.error('Error updating message:', err);
		alert('Failed to update message: ' + (err.message || err));
	}
}

function cancelMessageEdit(messageId, originalContent) {
	const el = document.getElementById(`message-${messageId}`);
	if (!el) return;
	const textContainer = el.querySelector('.message-text-container');
	textContainer.innerHTML = '';
	const p = document.createElement('p');
	p.className = 'text-sm message-content';
	p.textContent = originalContent;
	textContainer.appendChild(p);
}

async function deleteMessage(messageId) {
	if (!confirm('Delete this message? This action cannot be undone.')) return;
	try {
		const { error } = await supabase.from('messages').delete().eq('id', messageId);
		if (error) throw error;
		// Remove from DOM
		const el = document.getElementById(`message-${messageId}`);
		if (el && el.parentNode) el.parentNode.removeChild(el);
	} catch (err) {
		console.error('Error deleting message:', err);
		alert('Failed to delete message: ' + (err.message || err));
	}
}

// Realtime helpers for updates/deletes coming from other clients
function handleRemoteUpdateMessage(message) {
	if (!message || !message.id) return;
	const el = document.getElementById(`message-${message.id}`);
	if (!el) return;
	const contentP = el.querySelector('.message-content');
	if (contentP) contentP.textContent = message.content;
	const ts = el.querySelector('.message-timestamp');
	if (ts) ts.textContent = formatTimestamp(message.created_at || message.updated_at || new Date().toISOString());
}

// --- Profile helpers ---
async function ensureProfileCache(userId) {
	if (!userId) return null;
	if (profileCache[userId]) return profileCache[userId];
	try {
		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
		if (error) throw error;
		if (data) profileCache[userId] = data;
		return data || null;
	} catch (err) {
		console.error('Error fetching profile:', err);
		return null;
	}
}

async function ensureProfileCompleteness() {
	if (!state.user) return;
	const profile = await ensureProfileCache(state.user.id);
	const incomplete = !profile || !profile.full_name || !profile.matric_no || !profile.phone;
	if (incomplete) {
		// show profile completion view and prefill fields
		completeFullname.value = profile && profile.full_name ? profile.full_name : '';
		completeMatric.value = profile && profile.matric_no ? profile.matric_no : '';
		completePhone.value = profile && profile.phone ? profile.phone : '';
		changeView('profile-complete');
	}
}

async function saveProfile(profileData) {
	if (!state.user) return;
	const payload = {
		id: state.user.id,
		full_name: profileData.full_name,
		matric_no: profileData.matric_no,
		phone: profileData.phone,
		email: state.user.email
	};
	try {
		const { error } = await supabase.from('profiles').upsert(payload);
		if (error) throw error;
		profileCache[state.user.id] = payload;
		// update header
		userDisplayEmail.textContent = payload.full_name || state.user.email;
		return true;
	} catch (err) {
		console.error('Error saving profile:', err);
		alert('Failed to save profile: ' + (err.message || err));
		return false;
	}
}

function openProfileView() {
	if (!state.user) return changeView('auth');
	ensureProfileCache(state.user.id).then(profile => {
		profileFullname.value = profile && profile.full_name ? profile.full_name : '';
		profileMatric.value = profile && profile.matric_no ? profile.matric_no : '';
		profilePhone.value = profile && profile.phone ? profile.phone : '';
		profileEmail.value = state.user.email || '';
		changeView('profile');
	});
}

profileForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	const ok = await saveProfile({ full_name: profileFullname.value.trim(), matric_no: profileMatric.value.trim(), phone: profilePhone.value.trim() });
	if (ok) changeView('groups');
});
closeProfileBtn.addEventListener('click', () => changeView('groups'));

profileCompleteForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	const ok = await saveProfile({ full_name: completeFullname.value.trim(), matric_no: completeMatric.value.trim(), phone: completePhone.value.trim() });
	if (ok) changeView('groups');
});

async function openProfileDetails(userId) {
	if (!userId) return;
	const profile = await ensureProfileCache(userId);
	detailsName.textContent = (profile && profile.full_name) ? profile.full_name : 'User';
	detailsMatric.textContent = `Matric: ${profile && profile.matric_no ? profile.matric_no : '—'}`;
	detailsPhone.textContent = `Phone: ${profile && profile.phone ? profile.phone : '—'}`;
	detailsEmail.textContent = `Email: ${profile && profile.email ? profile.email : '—'}`;
	// Navigate to the profile details page view
	changeView('profile-details');
}

closeDetailsBtn.addEventListener('click', () => {
	// Return to chat if in a room, otherwise groups
	if (state.currentRoom) changeView('chat');
	else changeView('groups');
});

function handleRemoteDeleteMessage(messageId) {
	const el = document.getElementById(`message-${messageId}`);
	if (el && el.parentNode) el.parentNode.removeChild(el);
}

// --- Message menu helpers ---
function toggleMessageMenu(messageId) {
	// Close other menus first
	closeAllMessageMenus();
	const menu = document.querySelector(`.message-menu[data-message-id='${messageId}']`);
	const btn = document.querySelector(`.message-options-button[data-message-id='${messageId}']`);
	if (!menu || !btn) return;
	const isHidden = menu.classList.contains('hidden');
	if (isHidden) {
		menu.classList.remove('hidden');
		btn.setAttribute('aria-expanded', 'true');
	} else {
		menu.classList.add('hidden');
		btn.setAttribute('aria-expanded', 'false');
	}
}

function closeAllMessageMenus() {
	document.querySelectorAll('.message-menu').forEach(m => m.classList.add('hidden'));
	document.querySelectorAll('.message-options-button').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

// Download helper: fetches resource as blob and triggers a client download. Falls back to opening the URL.
async function downloadFile(url, filename) {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error('Network response was not ok');
		const blob = await res.blob();
		const blobUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = filename || '';
		document.body.appendChild(a);
		a.click();
		a.remove();
		// revoke after a short delay to ensure download started
		setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
	} catch (err) {
		// Fallback: open in new tab
		window.open(url, '_blank');
	}
}

// Get a signed URL for a message if possible, otherwise return the provided URL
async function getSignedUrlForMessage(message, expirySeconds = 60) {
	try {
		if (message && message.file_path) {
			const path = message.file_path;
			const { data, error } = await supabase.storage.from('group_files').createSignedUrl(path, expirySeconds);
			if (error) throw error;
			if (data && data.signedUrl) return data.signedUrl;
		}
	} catch (err) {
		console.warn('Could not create signed URL:', err);
	}
	// Fallback: use any public URL stored on the message
	return message && message.file_url ? message.file_url : null;
}

// Download (message-aware): get signed url then use downloadFile helper
async function downloadFileForMessage(message) {
	try {
		const url = await getSignedUrlForMessage(message);
		if (!url) return alert('File URL not available for download.');
		await downloadFile(url, message.file_name || 'file');
	} catch (err) {
		console.error('Download failed:', err);
		alert('Download failed: ' + (err.message || err));
	}
}

// File viewer: open a fullscreen preview for a message. Uses signed URL when available.
async function openFileViewerForMessage(message) {
	if (!message) return;
	const url = await getSignedUrlForMessage(message);
	if (!url) {
		// If we don't have any URL, try the stored file_url or open in new tab
		if (message.file_url) return openFileViewer(message.file_url, message.file_name);
		return alert('No file available to view.');
	}
	return openFileViewer(url, message.file_name);
}

// File viewer: open a fullscreen preview. Uses fetch->blob for previews when necessary
async function openFileViewer(url, filename) {
	const viewer = document.getElementById('file-viewer');
	const content = document.getElementById('file-viewer-content');
	const title = document.getElementById('file-viewer-title');
	const dl = document.getElementById('file-viewer-download');
	if (!viewer || !content) return window.open(url, '_blank');
	// Reset content
	content.innerHTML = '';
	title.textContent = filename || url.split('/').pop();
	// Wire download button
	dl.onclick = (e) => { e.stopPropagation(); downloadFile(url, filename); };

	// Helper to get extension
	function extOf(s) { try { return (s.split('?')[0].split('.').pop() || '').toLowerCase(); } catch (e) { return ''; } }
	const ext = extOf(filename || url);
	const imageExt = ['jpg','jpeg','png','gif','webp','avif','bmp','svg'];
	const videoExt = ['mp4','webm','ogg','mov'];
	const audioExt = ['mp3','wav','ogg','m4a'];
	const pdfExt = ['pdf'];

	// For images and pdfs, try to fetch blob and create object URL to ensure preview even when embed is restricted
	try {
		if (imageExt.includes(ext)) {
			const res = await fetch(url);
			if (!res.ok) throw new Error('Failed to fetch');
			const blob = await res.blob();
			const obj = URL.createObjectURL(blob);
			const img = document.createElement('img');
			img.src = obj;
			img.alt = filename || 'Image preview';
			img.onload = () => { /* nothing */ };
			content.appendChild(img);
			viewer.dataset._objUrl = obj;
		} else if (pdfExt.includes(ext)) {
			// PDFs: fetch blob and display via iframe/object for better cross-origin handling
			const res = await fetch(url);
			if (!res.ok) throw new Error('Failed to fetch');
			const blob = await res.blob();
			const obj = URL.createObjectURL(blob);
			const iframe = document.createElement('iframe');
			iframe.src = obj;
			iframe.className = 'w-full h-full';
			iframe.style.border = 'none';
			content.appendChild(iframe);
			viewer.dataset._objUrl = obj;
		} else if (videoExt.includes(ext)) {
			const video = document.createElement('video');
			video.controls = true;
			video.src = url;
			video.className = 'max-w-full max-h-full';
			content.appendChild(video);
		} else if (audioExt.includes(ext)) {
			const audio = document.createElement('audio');
			audio.controls = true;
			audio.src = url;
			content.appendChild(audio);
		} else {
			// Attempt to embed generic file types inside an iframe; if blocked the user can download
			const iframe = document.createElement('iframe');
			iframe.src = url;
			iframe.className = 'w-full h-full';
			iframe.style.border = 'none';
			content.appendChild(iframe);
		}
	} catch (err) {
		// Fallback to opening in new tab if preview fails
		console.warn('Preview failed, opening in new tab:', err);
		window.open(url, '_blank');
		return;
	}

	// Show viewer
	viewer.classList.remove('hidden');

	// Close handlers
	const closeBtn = document.getElementById('file-viewer-close');
	function doClose() { closeFileViewer(); }
	closeBtn.onclick = doClose;
	// Close on Escape
	function escHandler(e) { if (e.key === 'Escape') closeFileViewer(); }
	document.addEventListener('keydown', escHandler);
	// When closed, remove this key listener
	viewer.dataset._esc = true;
}

function closeFileViewer() {
	const viewer = document.getElementById('file-viewer');
	const content = document.getElementById('file-viewer-content');
	if (!viewer || !content) return;
	// Revoke any objectURL we created
	const obj = viewer.dataset._objUrl;
	if (obj) {
		try { URL.revokeObjectURL(obj); } catch (e) {}
		delete viewer.dataset._objUrl;
	}
	// Clear content
	content.innerHTML = '';
	viewer.classList.add('hidden');
	// Remove escape listener if present
	try { document.removeEventListener('keydown', (e) => { if (e.key === 'Escape') closeFileViewer(); }); } catch (e) {}
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
	// If click is inside a menu or on a menu button, ignore closing
	if (e.target.closest('.message-menu') || e.target.closest('.message-options-button')) return;
	closeAllMessageMenus();
});

// --- File Upload Logic ---

function setInputState(disabled) {
	chatInput.disabled = disabled;
	fileUploadButton.disabled = disabled;
	document.getElementById('send-button').disabled = disabled;
}

function showProgress(percentage) {
	progressContainer.classList.remove('hidden');
	progressBar.style.width = percentage + '%';
	setInputState(percentage > 0 && percentage < 100);
}

function hideProgress() {
	progressContainer.classList.add('hidden');
	progressBar.style.width = '0%';
	setInputState(false);
}

function handleFileChange() {
	if (fileInput.files.length > 0) {
		state.selectedFile = fileInput.files[0];
		fileNameDisplay.textContent = state.selectedFile.name;
		filePreviewContainer.classList.remove('hidden');
		chatInput.placeholder = `Add comment for ${state.selectedFile.name}...`;
		chatInput.required = false;
	} else {
		handleClearFile();
	}
}

function handleClearFile() {
	state.selectedFile = null;
	fileInput.value = '';
	filePreviewContainer.classList.add('hidden');
	fileNameDisplay.textContent = '';
	chatInput.placeholder = "Type a message or share an idea...";
	chatInput.required = true;
}

async function uploadFileToSupabase(file) {
	const fileName = `${state.currentRoom.id}/${state.user.id}_${Date.now()}_${file.name}`;
	const fileRef = fileName.replace(/[^a-zA-Z0-9.\-_/]/g, '_'); // Basic sanitization

	const { data, error } = await supabase.storage
		.from('group_files') // Ensure you create a 'group_files' bucket in Supabase Storage
		.upload(fileRef, file, {
			cacheControl: '3600',
			upsert: false
		});

	if (error) throw error;

	// Get the public URL
	const { data: { publicUrl } } = supabase.storage
		.from('group_files')
		.getPublicUrl(data.path);
    
	// Return both the public URL (if the bucket is public) and the storage path
	return { publicUrl, path: data.path };
}
        
async function handleChatSubmit(e) {
	e.preventDefault();
	const text = chatInput.value.trim();

	if (!text && !state.selectedFile) return;

	// Resolve sender display name from profile if available
	const profile = await ensureProfileCache(state.user.id);
	// Always send the profile full name as sender_name when available
	const senderName = (profile && profile.full_name) ? profile.full_name : (state.user.email || 'Guest');

	const messagePayload = {
		group_id: state.currentRoom.id,
		user_id: state.user.id,
		sender_name: senderName,
		content: text,
		file_url: null,
		file_name: null,
	};

	try {
		if (state.selectedFile) {
			showProgress(1); // Start progress at 1%
			const uploadResult = await uploadFileToSupabase(state.selectedFile);
			// uploadResult: { publicUrl, path }
			messagePayload.file_url = uploadResult.publicUrl || null; // may be null if bucket is private
			messagePayload.file_path = uploadResult.path || null; // store storage path so we can request signed urls later
			messagePayload.file_name = state.selectedFile.name;
		}
        
		// Supabase Storage does not expose a standard uploadBytesResumable stream
		// to track progress precisely in vanilla JS using the current client method. 
		// We'll set it to 100% manually after the upload is complete.
		hideProgress(); 

		// Insert the message and return the inserted row so we can render it immediately.
		const { data: inserted, error } = await supabase.from('messages')
			.insert(messagePayload)
			.select()
			.single();

		if (error) throw error;

		// Render the new message locally so the sender sees it immediately
		if (inserted) {
			renderMessage(inserted);
			scrollToBottom();
		}

		chatInput.value = '';
		handleClearFile();
		// Keep focus on the input so mobile keyboard remains open
		try { chatInput.focus(); } catch (e) { /* ignore */ }

	} catch (error) {
		console.error("Error sending message/file:", error);
		alert(`Failed to send: ${error.message}. Check Supabase Security Rules for storage and database.`);
		hideProgress();
	}
}

/** --- Setup & Listeners --- **/
        
// Initial setup
// If developers left placeholders or keys are missing, avoid making any network requests
// which would cause "Failed to fetch" errors when running the file locally or with invalid config.
if (SUPABASE_URL.includes('placeholder') || SUPABASE_ANON_KEY.includes('placeholder') || !SUPABASE_URL.trim() || !SUPABASE_ANON_KEY.trim()) {
	// Stop trying to connect and show an instructive message in the auth panel instead.
	showLoading(false);
	changeView('auth');
	showMessage(authMessage, "Supabase URL or ANON Key are placeholders. Replace SUPABASE_URL and SUPABASE_ANON_KEY in this file with your project's values and serve the page via a local HTTP server (e.g., http://localhost) to avoid network/CORS issues.", true);
	authSubmitButton.disabled = true;
} else {
	// Normal startup
	showLoading(true);
	setupAuthListener();
}
        
// Auth listeners
toggleAuthModeButton.addEventListener('click', handleAuthToggle);
authForm.addEventListener('submit', handleAuthSubmit);
if (logoutButton) logoutButton.addEventListener('click', handleLogout);

// Group listeners
groupSearchInput.addEventListener('input', handleGroupSearch);
groupCreationForm.addEventListener('submit', handleGroupCreation);
backToGroupsButton.addEventListener('click', () => {
	if (state.realtimeChannel) {
		supabase.removeChannel(state.realtimeChannel);
	}
	state.currentRoom = null;
	changeView('groups');
});

// Chat listeners
fileUploadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileChange);
clearFileButton.addEventListener('click', handleClearFile);
chatForm.addEventListener('submit', handleChatSubmit);

