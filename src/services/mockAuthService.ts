// Mock Authentication Service for Development
export interface MockUser {
  id: string;
  email: string;
  name: string;
  subscription_tier: 'free' | 'premium' | 'savage';
}

export class MockAuthService {
  private static currentUser: MockUser | null = null;

  static async signIn(email: string, password: string): Promise<MockUser> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user: MockUser = {
      id: 'mock-user-123',
      email: email,
      name: email.split('@')[0],
      subscription_tier: 'premium' // Default to premium for testing
    };
    
    this.currentUser = user;
    console.log('Mock sign in successful:', user);
    return user;
  }

  static async signUp(email: string, password: string, name: string): Promise<MockUser> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const user: MockUser = {
      id: `mock-user-${Date.now()}`,
      email: email,
      name: name,
      subscription_tier: 'free'
    };
    
    this.currentUser = user;
    console.log('Mock sign up successful:', user);
    return user;
  }

  static async getCurrentUser(): Promise<MockUser | null> {
    return this.currentUser;
  }

  static async signOut(): Promise<void> {
    this.currentUser = null;
    console.log('Mock sign out successful');
  }

  static async isAuthenticated(): Promise<boolean> {
    return this.currentUser !== null;
  }

  static async getAuthToken(): Promise<string | null> {
    if (this.currentUser) {
      return `mock-token-${this.currentUser.id}`;
    }
    return null;
  }
}
