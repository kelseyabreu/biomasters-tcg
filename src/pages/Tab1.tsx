import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import SystemStatus from '../components/SystemStatus';
import './Tab1.css';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab 1</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">System Status</IonTitle>
          </IonToolbar>
        </IonHeader>
        <SystemStatus />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
