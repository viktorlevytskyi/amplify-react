import { useAuthenticator } from '@aws-amplify/ui-react';
import AutocompleteSearch from './AutocompleteSearch';


function App() {
  const { user, signOut } = useAuthenticator();

  return (
    <main>
      <AutocompleteSearch />
      <h1>{user?.signInDetails?.loginId}</h1>
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
