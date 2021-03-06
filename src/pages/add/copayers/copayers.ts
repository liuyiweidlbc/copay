import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  App,
  Events,
  NavController,
  NavParams,
  ViewController
} from 'ionic-angular';

// Pages
import { WalletDetailsPage } from '../../../pages/wallet-details/wallet-details';

// Providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { AppProvider } from '../../../providers/app/app';
import { BwcErrorProvider } from '../../../providers/bwc-error/bwc-error';
import { Logger } from '../../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../../providers/platform/platform';
import { PopupProvider } from '../../../providers/popup/popup';
import { ProfileProvider } from '../../../providers/profile/profile';
import { PushNotificationsProvider } from '../../../providers/push-notifications/push-notifications';
import { WalletProvider } from '../../../providers/wallet/wallet';
import { TabsPage } from '../../tabs/tabs';

@Component({
  selector: 'page-copayers',
  templateUrl: 'copayers.html'
})
export class CopayersPage {
  public appName: string;
  public appUrl: string;
  public isCordova: boolean;

  public wallet;
  public copayers;
  public secret;

  constructor(
    private app: App,
    private appProvider: AppProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private events: Events,
    private logger: Logger,
    private navCtrl: NavController,
    private navParams: NavParams,
    private platformProvider: PlatformProvider,
    private popupProvider: PopupProvider,
    private profileProvider: ProfileProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private walletProvider: WalletProvider,
    private translate: TranslateService,
    private pushNotificationsProvider: PushNotificationsProvider,
    private viewCtrl: ViewController,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.secret = null;
    this.appName = this.appProvider.info.userVisibleName;
    this.appUrl = this.appProvider.info.url;
    this.isCordova = this.platformProvider.isCordova;
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
  }

  ionViewWillEnter() {
    this.logger.info('ionViewDidLoad CopayersPage');
    this.updateWallet();

    this.events.subscribe('bwsEvent', (walletId, type) => {
      if (
        this.wallet &&
        walletId == this.wallet.id &&
        type == ('NewCopayer' || 'WalletComplete')
      ) {
        this.updateWallet();
      }
    });
  }

  ionViewWillLeave() {
    this.events.unsubscribe('bwsEvent');
  }

  close() {
    this.viewCtrl.dismiss();
  }

  private updateWallet(): void {
    this.logger.debug('Updating wallet:' + this.wallet.name);
    this.walletProvider
      .getStatus(this.wallet, {})
      .then(status => {
        this.wallet.status = status;
        this.copayers = this.wallet.status.wallet.copayers;
        this.secret = this.wallet.status.wallet.secret;
        if (status.wallet.status == 'complete') {
          this.wallet.openWallet(err => {
            if (err) this.logger.error(err);

            this.navCtrl.popToRoot();
            this.navCtrl.push(WalletDetailsPage, {
              walletId: this.wallet.credentials.walletId
            });
          });
        }
      })
      .catch(err => {
        let message = this.translate.instant('Could not update wallet');
        this.popupProvider.ionicAlert(this.bwcErrorProvider.msg(err, message));
        return;
      });
  }

  public showDeletePopup(): void {
    let title = this.translate.instant('Confirm');
    let msg = this.translate.instant(
      'Are you sure you want to cancel and delete this wallet?'
    );
    this.popupProvider.ionicConfirm(title, msg).then(res => {
      if (res) this.deleteWallet();
    });
  }

  private deleteWallet(): void {
    this.onGoingProcessProvider.set('deletingWallet');
    this.profileProvider
      .deleteWalletClient(this.wallet)
      .then(() => {
        this.onGoingProcessProvider.clear();

        this.pushNotificationsProvider.unsubscribe(this.wallet);
        this.app.getRootNavs()[0].setRoot(TabsPage);
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        let errorText = this.translate.instant('Error');
        this.popupProvider.ionicAlert(errorText, err.message || err);
      });
  }

  public showFullInfo(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet('copayers', {
      secret: this.secret
    });
    infoSheet.present();
  }
}
