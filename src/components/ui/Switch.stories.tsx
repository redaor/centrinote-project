import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';
import { useState } from 'react';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'État actuel du switch'
    },
    disabled: {
      control: 'boolean',
      description: 'Désactiver le switch'
    },
    label: {
      control: 'text',
      description: 'Label du switch'
    },
    description: {
      control: 'text',
      description: 'Description additionnelle'
    },
    darkMode: {
      control: 'boolean',
      description: 'Mode sombre'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Switch>;

// Composant wrapper pour gérer l'état
const SwitchWithState = (args: any) => {
  const [checked, setChecked] = useState(args.checked || false);
  
  return (
    <Switch
      {...args}
      checked={checked}
      onChange={setChecked}
    />
  );
};

export const Default: Story = {
  render: (args) => <SwitchWithState {...args} />,
  args: {
    label: 'Notifications',
    description: 'Recevoir des notifications par email',
    checked: false,
    disabled: false,
    darkMode: false
  }
};

export const Checked: Story = {
  render: (args) => <SwitchWithState {...args} />,
  args: {
    label: 'Mode sombre',
    description: 'Activer le thème sombre',
    checked: true,
    disabled: false,
    darkMode: false
  }
};

export const Disabled: Story = {
  render: (args) => <SwitchWithState {...args} />,
  args: {
    label: 'Option désactivée',
    description: 'Cette option n\'est pas disponible',
    checked: false,
    disabled: true,
    darkMode: false
  }
};

export const DarkMode: Story = {
  render: (args) => (
    <div className="dark bg-gray-900 p-8 rounded-lg">
      <SwitchWithState {...args} />
    </div>
  ),
  args: {
    label: 'Rappels',
    description: 'Notifications de rappels d\'étude',
    checked: true,
    disabled: false,
    darkMode: true
  }
};

export const WithoutDescription: Story = {
  render: (args) => <SwitchWithState {...args} />,
  args: {
    label: 'Autoriser les cookies',
    checked: false,
    disabled: false,
    darkMode: false
  }
};

export const MultipleOptions: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      emails: true,
      push: false,
      sms: true,
      newsletter: false
    });

    return (
      <div className="space-y-6 p-6 bg-white rounded-xl border">
        <h3 className="text-lg font-semibold">Préférences de notification</h3>
        
        <Switch
          checked={settings.emails}
          onChange={(value) => setSettings({ ...settings, emails: value })}
          label="Emails"
          description="Recevoir des notifications par email"
        />
        
        <Switch
          checked={settings.push}
          onChange={(value) => setSettings({ ...settings, push: value })}
          label="Notifications push"
          description="Notifications push sur votre appareil"
        />
        
        <Switch
          checked={settings.sms}
          onChange={(value) => setSettings({ ...settings, sms: value })}
          label="SMS"
          description="Recevoir des SMS pour les alertes importantes"
        />
        
        <Switch
          checked={settings.newsletter}
          onChange={(value) => setSettings({ ...settings, newsletter: value })}
          label="Newsletter"
          description="Recevoir la newsletter hebdomadaire"
        />
      </div>
    );
  }
};

