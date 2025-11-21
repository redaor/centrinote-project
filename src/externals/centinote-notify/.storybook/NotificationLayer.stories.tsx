import type { Meta, StoryObj } from '@storybook/react';
import { NotifyProvider, NotificationLayer, useNotify } from '../index';

// Wrapper component for stories
function NotificationLayerWrapper({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <NotifyProvider>
      <NotificationLayer theme={theme} />
      <NotificationDemo />
    </NotifyProvider>
  );
}

function NotificationDemo() {
  const { notify } = useNotify();

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Notification Demo</h2>
      
      <button
        onClick={() =>
          notify({
            level: 'info',
            title: 'Information',
            body: 'Voici une notification simple',
            icon: 'ℹ️',
          })
        }
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Notification simple
      </button>

      <button
        onClick={() =>
          notify({
            level: 'success',
            title: 'Sauvegarde réussie',
            body: 'Vos modifications ont été enregistrées',
            actions: [
              {
                label: 'Voir',
                onClick: () => console.log('Voir'),
                primary: true,
              },
              {
                label: 'Ignorer',
                onClick: () => console.log('Ignorer'),
              },
            ],
            icon: '✅',
          })
        }
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Notification avec actions
      </button>

      <button
        onClick={() => {
          notify({
            level: 'info',
            title: 'Notification 1',
            body: 'Première notification',
          });
          setTimeout(() => {
            notify({
              level: 'success',
              title: 'Notification 2',
              body: 'Deuxième notification',
            });
          }, 1000);
          setTimeout(() => {
            notify({
              level: 'warning',
              title: 'Notification 3',
              body: 'Troisième notification',
            });
          }, 2000);
        }}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Test agrégation (3 notifications)
      </button>

      <button
        onClick={() =>
          notify({
            level: 'automation',
            title: 'Automatisation exécutée',
            body: 'Votre citation du jour a été envoyée',
            icon: '💭',
          })
        }
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        Notification automation (se rétracte après 3s)
      </button>
    </div>
  );
}

const meta: Meta<typeof NotificationLayerWrapper> = {
  title: 'Centinote-Notify/NotificationLayer',
  component: NotificationLayerWrapper,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof NotificationLayerWrapper>;

export const Simple: Story = {
  args: {
    theme: 'light',
  },
};

export const Aggregation: Story = {
  args: {
    theme: 'light',
  },
  render: (args) => <NotificationLayerWrapper {...args} />,
};

export const WithActions: Story = {
  args: {
    theme: 'light',
  },
  render: (args) => <NotificationLayerWrapper {...args} />,
};

