import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(name: IoniconsName, activeName: IoniconsName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? activeName : name} size={size} color={color} />
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a56db',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: { backgroundColor: '#1a56db' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarLabel: 'Pedidos',
          tabBarIcon: tabIcon('document-text-outline', 'document-text'),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Estoque',
          tabBarLabel: 'Estoque',
          tabBarIcon: tabIcon('cube-outline', 'cube'),
        }}
      />
      <Tabs.Screen
        name="financial"
        options={{
          title: 'Financeiro',
          tabBarLabel: 'Financeiro',
          tabBarIcon: tabIcon('wallet-outline', 'wallet'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: tabIcon('person-outline', 'person'),
        }}
      />
      {/* Nested screens — hidden from tab bar */}
      <Tabs.Screen name="orders/[id]" options={{ href: null, title: 'Detalhes do Pedido', headerShown: true }} />
      <Tabs.Screen name="orders/new" options={{ href: null, title: 'Novo Pedido', headerShown: true }} />
    </Tabs>
  )
}
