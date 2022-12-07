<!-- 
 Copyright (c) 2022 lmvdz

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 -->

<template>

  <v-app id="inspire">

    <v-alert closable variant="tonal" v-model="state.alert.show" :type="state.alert.type"
      style="z-index: 1000; position: absolute; top: 0px; right: 0px; margin: 1em;"
      :text="state.alert.message"></v-alert>

    <v-dialog v-model="logoutDialog">
      <div class="d-flex align-top justify-center">
        <v-card style="width: 400px">
          <v-card-title>Logout</v-card-title>
          <v-card-subtitle>Are you sure you want to logout?</v-card-subtitle>
          <v-card-actions>
            <v-btn variant="outlined" @click="logout()" color="error">Logout</v-btn>
            <v-btn variant="outlined" @click="logoutDialog = false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <v-dialog v-model="deleteDialog">
      <div class="d-flex align-top justify-center">
        <v-card style="width: 400px">
          <v-card-title>Deletion</v-card-title>
          <v-card-subtitle>Are you sure you want to delete your user?</v-card-subtitle>
          <v-card-actions>
            <v-btn variant="outlined" @click="deleteUser()" color="error">Delete</v-btn>
            <v-btn variant="outlined" @click="deleteDialog = false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <v-dialog v-model="startDialog">
      <div class="d-flex align-top justify-center">
        <v-card style="width: 400px">
          <v-card-title>Start Running?</v-card-title>
          <v-card-subtitle>Allow the bot to pull data from Exchanges?</v-card-subtitle>
          <v-card-actions>
            <v-btn variant="outlined" @click="start()" color="success">Start</v-btn>
            <v-btn variant="outlined" @click="startDialog = false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <v-dialog v-model="stopDialog">
      <div class="d-flex align-top justify-center">
        <v-card style="width: 400px">
          <v-card-title>Stop Running?</v-card-title>
          <v-card-subtitle>Are you sure you want to stop the bot?</v-card-subtitle>
          <v-card-actions>
            <v-btn variant="outlined" @click="stop()" color="error">Stop</v-btn>
            <v-btn variant="outlined" @click="stopDialog = false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <v-navigation-drawer app model-value class="pt-4" rail v-if="state.twitchUserInfo !== null">
      <v-avatar style="margin-top: 1em; cursor: pointer;" :color="`grey-darken-1`"
        :image="state.twitchUserInfo !== null ? state.twitchUserInfo.profile_image_url : ''" :size="36" @click="() => {
          if (state.twitchUserInfo !== null) {
            state.logoutDialog = true;
          }
        }" class="d-block text-center mx-auto mb-9"></v-avatar>
      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <!-- <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null" :active="state.editExchangeKeys" flat
        class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-key"
        :color="state.editExchangeKeys ? 'primary' : 'secondary'"
        @click="state.editExchangeKeys = !state.editExchangeKeys" />
      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null" :active="state.editDiscordInfo" flat
        class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-forum"
        :color="state.editDiscordInfo ? 'primary' : 'secondary'"
        @click="state.editDiscordInfo = !state.editDiscordInfo" />
      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null" :active="state.editTwitchInfo" flat
        class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-chat"
        :color="state.editTwitchInfo ? 'primary' : 'secondary'"
        @click="state.editTwitchInfo = !state.editTwitchInfo" />
      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null" :active="state.deleteDialog" flat
        color="error" class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-trash-can"
        @click="state.deleteDialog = !state.deleteDialog" />
      <v-divider></v-divider> -->

    </v-navigation-drawer>

    <v-main>
      <v-container class="fill-height">
        <v-responsive class="d-flex align-center text-center justify-center fill-height">
          <!-- <v-img contain height="300" src="src/assets/logo.svg" /> -->

          <!-- <div class="text-body-2 font-weight-light mb-n1">Welcome to</div> -->

          <h1 v-if="state.twitchUserInfo === null" class="text-h3 font-weight-bold">CryptoPositionsBot</h1>

          <h2 class="text-h4 font-weight-bold" v-if="state.twitchUserInfo !== null" style="color: rgb(169, 94, 171)">
            Logged In As: {{ state.twitchUserInfo.display_name }} <v-btn size="x-small" variant="plain" icon="mdi-share"
              color="success" @click="copyRefLink()"></v-btn></h2>
          <h3 class="text-h5 font-weight-bold"
            v-if="state.userInfo !== null && state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== ''"
            style="color: rgb(148 143 149)">Referred By: {{ state.userInfo.REF_LINK }}</h3>
          <v-text-field 
            v-if="(state.userInfo === null && state.twitchUserInfo === null) || (state.userInfo !== null && !(state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== ''))"
            style="margin: 2em auto 0 auto; width: 300px;" variant="underlined" persistent-hint
            :hint="state.userInfo !== null ? state.refLink.toLowerCase() === state.userInfo.TWITCH_CHANNEL.substring(1).toLowerCase() ? 'Can not refer yourself.' : 'Can not be changed once set.' : ''"
            label="Referred By (Twitch Username)" v-model="state.refLink">
            <template v-slot:append-inner
              v-if="(state.userInfo !== null && !(state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== ''))">
              <v-btn
                :disabled="state.refLink === '' || state.refLink === null || state.refLink === undefined || state.refLink.toLowerCase() === state.userInfo.TWITCH_CHANNEL.substring(1).toLowerCase()"
                @click="trySetupRefLink(state.refLink)" variant="text" icon="mdi-content-save" color="success"></v-btn>
            </template>
          </v-text-field>
          <div class="py-5" />

          <v-row class="d-flex align-top justify-center" v-if="state.twitchUserInfo === null">
            <v-col cols="auto">
              <!-- {{twitchUserInfo}} -->
              <v-btn variant="outlined" @click="connectTwitch" color="rgb(169, 94, 171)">Connect
                Twitch</v-btn>
            </v-col>
          </v-row>

          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null">
            <v-col cols="auto">
              <v-checkbox label="Active" v-model="state.enabled"></v-checkbox>
              <v-btn variant="outlined" color="success" v-if="state.enabled !== state.userInfo.ENABLED"
                @click="updateEnabledState()">Save
              </v-btn>
            </v-col>
          </v-row>

          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null">
            <v-col cols="auto">
              <v-btn variant="outlined" :icon="!state.userInfo.IS_RUNNING ? 'mdi-play' : 'mdi-stop'"
                :disabled="!state.enabled" :color="state.userInfo.IS_RUNNING ? 'error' : 'success'"
                v-if="state.twitchUserInfo !== null" @click="() => {
                  if (state.userInfo.IS_RUNNING) {
                    stopDialog = true;
                  } else {
                    startDialog = true;
                  }
                }">
              </v-btn>
            </v-col>
          </v-row>

          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null">
            <v-col cols="auto">
              <div style="max-height: 450px; padding: .5em;" class="overflow-y-auto" v-if="state.editExchangeKeys">
                <h3>Exchange Keys</h3>
                <p style="margin-top: 1em;" v-for="(exchangeKey, index) in state.exchangeKeys"
                  :key="'exchangeKey-' + index">
                <p style="margin-bottom: 1em;">#{{ index + 1 }}</p>
                <v-autocomplete :disabled="!enabled" variant="underlined" style="height: auto" density="compact"
                  label="EXCHANGE" :items="validExchanges" v-model="exchangeKey.EXCHANGE_ID"></v-autocomplete>
                <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="DESCRIPTION"
                  v-model="exchangeKey.DESCRIPTION"></v-text-field>
                <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="API KEY"
                  v-model="exchangeKey.API_KEY" type="password"></v-text-field>
                <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="API SECRET"
                  v-model="exchangeKey.API_SECRET" type="password"></v-text-field>
                <v-btn variant="outlined" :disabled="!enabled" style="margin-bottom: 2em;" color="error"
                  @click="() => { state.exchangeKeys.splice(index, 1) }">Remove Exchange API Key #{{ index + 1 }}
                </v-btn>
                </p>
                <p class="d-flex align-top justify-center">
                  <v-btn variant="outlined" :disabled="!enabled" color="primary"
                    @click="state.exchangeKeys.push({ KEY_ID: uuidv4(), EXCHANGE_ID: '', API_KEY: '', API_SECRET: '', DESCRIPTION: '' })">
                    Add Exchange API Key</v-btn>
                </p>
              </div>
              <div v-if="editExchangeKeys">
                <p style="margin-top: 1em;">

                  <v-btn variant="outlined" :disabled="!state.enabled || exchangeKeysHash === computedExchangeKeysHash"
                    style="margin: .25em;" color="success" @click="updateUserExchangeKeys()">Save</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled"
                    v-if="state.exchangeKeys.length !== state.userInfo.EXCHANGE_KEYS.length || exchangeKeysHash !== computedExchangeKeysHash"
                    style="margin: .25em;" color="error" @click="cancelExchangeKeyChanges()">Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" v-else style="margin: .25em;" color="error"
                    @click="state.editExchangeKeys = !state.editExchangeKeys">Close</v-btn>
                </p>
              </div>
            </v-col>
            <v-col cols="auto">
              <div style="margin-top: 1em; max-height: 400px; min-width: 400px; padding: 1em;" class="overflow-y-auto"
                v-if="state.editDiscordInfo">
                <h3>Discord Settings</h3>
                <v-checkbox :disabled="!state.enabled" label="Discord Enabled" v-model="state.discordEnabled" />
                <div style="margin-bottom: 2em;">
                  <v-btn color="primary" target="_blank" variant="outlined"
                    href="https://discord.com/api/oauth2/authorize?client_id=1044389854236127262&permissions=83968&scope=bot">Invite
                    Discord Bot</v-btn>
                </div>

                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact"
                  label="Discord Channel ID" v-model="state.discordChannelId"></v-text-field>
                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact"
                  label="Discord Message ID" v-model="state.discordMessageId"></v-text-field>
                <p>
                  <v-btn variant="outlined" style="margin: .25em;" color="success" @click="updateUserDiscordInfo()"
                    :disabled="!state.enabled || !(state.discordEnabled !== state.userInfo.DISCORD_ENABLED || state.discordChannelId !== state.userInfo.DISCORD_CHANNEL || state.discordMessageId !== state.userInfo.DISCORD_MESSAGE)">
                    Save</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="cancelDiscordChanges()"
                    v-if="state.discordEnabled !== state.userInfo.DISCORD_ENABLED || state.discordChannelId !== state.userInfo.DISCORD_CHANNEL || state.discordMessageId !== state.userInfo.DISCORD_MESSAGE">
                    Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="state.editDiscordInfo = !state.editDiscordInfo"
                    v-if="state.discordEnabled === state.userInfo.DISCORD_ENABLED && state.discordChannelId === state.userInfo.DISCORD_CHANNEL && state.discordMessageId === state.userInfo.DISCORD_MESSAGE">
                    Close</v-btn>
                </p>
              </div>
            </v-col>
            <v-col cols="auto">
              <div style="margin-top: 1em; max-height: 400px; min-width: 400px; padding: 1em;" class="overflow-y-auto"
                v-if="editTwitchInfo">
                <h3>Twitch Settings</h3>
                <v-checkbox :disabled="!state.enabled" label="Twitch Enabled" v-model="twitchEnabled" />
                <v-checkbox :disabled="!state.enabled" label="Timeout Enabled" v-model="twitchTimeoutEnabled" />
                <v-btn color="primary" style="margin-bottom: 2em;" variant="outlined"
                  v-if="!state.connectedToTwitchChannel" @click="connectToTwitchChannel()">Connect To Twitch Channel
                </v-btn>
                <v-btn color="error" style="margin-bottom: 2em;" variant="outlined" v-else
                  @click="disconnectFromTwitchChannel()">Disconnect from Twitch Channel
                </v-btn>
                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact" type="number"
                  label="Timeout Length (minutes)" v-model="state.twitchTimeoutLength" />
                <p>
                  <v-btn variant="outlined" style="margin: .25em;" color="success" @click="updateUserTwitchInfo()"
                    :disabled="!enabled || !(state.twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString()))">
                    Save</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="cancelTwitchChanges()"
                    v-if="state.twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString())">
                    Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="state.editTwitchInfo = !state.editTwitchInfo"
                    v-if="!(twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString()))">
                    Close</v-btn>
                </p>
              </div>
            </v-col>
          </v-row>

        </v-responsive>
      </v-container>

    </v-main>

    <v-footer app style="max-height: 1.5em;">
      CryptoPositionsBot 2022
    </v-footer>
  </v-app>

</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import axios from 'axios'
//@ts-ignore
import { v4 as uuidv4 } from 'uuid'
import validExchanges from './exchanges';
import { computed } from '@vue/reactivity';
import { stat } from 'fs';

type AlertType = "success" | "error" | "warning" | "info" | undefined

const alert = ref<{
  show: boolean,
  message: string,
  type: AlertType
  timeout: NodeJS.Timer | null
}>({ show: false, message: '', type: 'success', timeout: null })
const refLink = ref<string>('');
const copiedRefLink = ref<string>('');
const referrals = ref<Array<{ twitchChannel: string }>>([]);
const exchangeKeysHash = ref<string>('');
const exchangeKeys = ref<Array<ExchangeKey>>([])
const computedExchangeKeysHash = computed(() => {
  return Buffer.from(JSON.stringify(exchangeKeys.value), 'utf-8').toString('base64')
})
const twitchAccessToken = ref<any>({})
const twitchUserInfo = ref<any>(null);
const editExchangeKeys = ref<boolean>(true);
const editDiscordInfo = ref<boolean>(true);
const deleteDialog = ref<boolean>(false);
const logoutDialog = ref<boolean>(false);
const startDialog = ref<boolean>(false);
const stopDialog = ref<boolean>(false);
const editTwitchInfo = ref<boolean>(true);
const discordChannelId = ref<string>('');
const discordMessageId = ref<string>('');
const enabled = ref<boolean>(false);
const discordEnabled = ref<boolean>(false);
const twitchEnabled = ref<boolean>(false);
const twitchTimeoutEnabled = ref<boolean>(false);
const twitchTimeoutLength = ref<number>(5);
const connectedToTwitchChannel = ref<boolean>(false);

const userInfo = ref<any>(null);

const state = reactive({
  alert,
  copiedRefLink,
  refLink,
  referrals,
  exchangeKeys,
  twitchAccessToken,
  twitchUserInfo,
  editExchangeKeys,
  editDiscordInfo,
  editTwitchInfo,
  discordChannelId,
  discordMessageId,
  enabled,
  discordEnabled,
  twitchEnabled,
  twitchTimeoutEnabled,
  twitchTimeoutLength,
  userInfo,
  deleteDialog,
  logoutDialog,
  startDialog,
  stopDialog,
  connectedToTwitchChannel
})

const log = (...args: any) => {
  console.log(...args)
}

const connectTwitch = () => {
  if (window.location.host !== 'localhost:3000' && window.location.host !== '127.0.0.1:3000') {
    window.location.href = (`https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=z5o8ef6nmef6wbxm2h6ry6xfatvqud&redirect_uri=https://www.cryptopositionsbot.com/&state=${state.refLink}`)
  } else {
    window.location.href = (`https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=z5o8ef6nmef6wbxm2h6ry6xfatvqud&redirect_uri=http://localhost:3000/&state=${state.refLink}`)
  }
}

const copyRefLink = () => {
  navigator.clipboard.writeText(`https://www.cryptopositionsbot.com/?ref=${state.userInfo.TWITCH_CHANNEL.toLowerCase().substring(1)}`);
  notify("Copied ref link to clipboard", 'success')
}

onMounted(() => {
  if (document.location.hash) {
    var hash = {} as any;
    decodeURIComponent(window.location.hash.substring(1)).split('&').forEach(variable => {
      let [key, value] = variable.split('=')
      hash[key] = value;
    })
    state.twitchAccessToken = hash;
    document.location.hash = '';
    getTwitchUserInfo().then(() => {
      getUserInfo().then(() => {
        getReferrals();
        isConnectedToTwitchChannel();
      }).catch(error => {
        console.error(error);
      })
    }).catch(error => {
      console.error(error);
    })
  }
  let params = (new URL(window.location.href)).searchParams;
  if (params.has('ref')) {
    state.refLink = params.get('ref')!;
  }
})

const getTwitchUserInfo = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    axios.get(`https://bot.cryptopositionsbot.com/twitchUserInfo?access_token=${state.twitchAccessToken.access_token}`).then((response) => {
      state.twitchUserInfo = response.data;
      resolve();
    }).catch(error => {
      console.error(error);
      reject(error);
    })
  })

}

const getUserInfo = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    axios.get(`https://bot.cryptopositionsbot.com/userInfo?access_token=${state.twitchAccessToken.access_token}`).then((response) => {
      exchangeKeysHash.value = Buffer.from(JSON.stringify(response.data.EXCHANGE_KEYS), 'utf-8').toString('base64')
      state.userInfo = response.data;
      if (state.userInfo.EXCHANGE_KEYS.length > 0) {
        state.exchangeKeys.push(...response.data.EXCHANGE_KEYS);
      }
      state.discordChannelId = response.data.DISCORD_CHANNEL;
      state.discordMessageId = response.data.DISCORD_MESSAGE;
      state.discordEnabled = response.data.DISCORD_ENABLED;
      state.twitchEnabled = response.data.TWITCH_ENABLED;
      state.twitchTimeoutEnabled = response.data.TWITCH_TIMEOUT;
      state.twitchTimeoutLength = response.data.TWITCH_TIMEOUT_EXPIRE;
      state.enabled = response.data.ENABLED;
      state.refLink = response.data.REF_LINK || '';
      if ((state.refLink === null || state.refLink === undefined || state.refLink === '') && state.twitchAccessToken.state !== '' && state.twitchAccessToken.state !== undefined && state.twitchAccessToken.state !== null) {
        if (state.twitchAccessToken.state.toLowerCase() !== state.userInfo.TWITCH_CHANNEL.toLowerCase().substring(1)) {
          trySetupRefLink(state.twitchAccessToken.state).then(() => {
            resolve();
          }).catch(error => {
            console.error(error);
            reject(error);
          })
        } else {
          notify("Cannot refer yourself " + state.userInfo.TWITCH_CHANNEL, 'error');
        }
      } else {
        resolve();
      }
    }).catch(error => {
      console.error(error);
      reject(error);
    })
  })
}

const trySetupRefLink = (refLink: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (confirm('Are you sure you want to set your referral to: ' + refLink)) {
      axios.post(`https://bot.cryptopositionsbot.com/trySetupRefLink`, { access_token: state.twitchAccessToken.access_token, refLink: refLink }).then((response) => {
        if (response.data === true) {
          state.refLink = refLink
          state.userInfo.REF_LINK = state.refLink
          notify('Ref Link connected to ' + state.refLink, 'success')
          resolve();
        } else {
          notify(response.data, 'error')
          state.refLink = ''
          resolve();
        }
      }).catch(error => {
        console.error(error);
        reject(error);
      })
    } else {
      resolve();
    }
  })
}

const getReferrals = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    axios.get(`https://bot.cryptopositionsbot.com/referrals?access_token=${state.twitchAccessToken.access_token}`).then((response) => {
      state.referrals = response.data;
      resolve()
    }).catch(error => {
      notify("Failed to retrieve referrals", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const cancelExchangeKeyChanges = () => {
  if (state.userInfo.EXCHANGE_KEYS.length > 0) {
    state.exchangeKeys = [...state.userInfo.EXCHANGE_KEYS]
  }
}

const cancelDiscordChanges = () => {
  state.discordChannelId = state.userInfo.DISCORD_CHANNEL;
  state.discordMessageId = state.userInfo.DISCORD_MESSAGE;
  state.discordEnabled = state.userInfo.DISCORD_ENABLED;
}

const cancelTwitchChanges = () => {
  state.twitchEnabled = state.userInfo.TWITCH_ENABLED;
  state.twitchTimeoutEnabled = state.userInfo.TWITCH_TIMEOUT;
  state.twitchTimeoutLength = state.userInfo.TWITCH_TIMEOUT_EXPIRE;
}

const updateUserExchangeKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token,
      exchangeKeys: state.exchangeKeys
    }
    axios.post(`https://bot.cryptopositionsbot.com/userExchangeKeys`, data).then((response) => {
      exchangeKeysHash.value = Buffer.from(JSON.stringify(state.exchangeKeys), 'utf-8').toString('base64')
      state.userInfo.EXCHANGE_KEYS = state.exchangeKeys.map(exchangeKey => {
        return {
          EXCHANGE_ID: exchangeKey.EXCHANGE_ID,
          DESCRIPTION: exchangeKey.DESCRIPTION,
          API_KEY: new Array(exchangeKey.API_KEY.length + 1).join("*"),
          API_SECRET: new Array(exchangeKey.API_SECRET.length + 1).join("*"),
          KEY_ID: exchangeKey.KEY_ID
        } as ExchangeKey
      });
      notify("Updated exchange keys", 'success');
      resolve()
    }).catch(error => {
      notify("Failed to update exchange keys", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const updateUserDiscordInfo = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token,
      discordInfo: { DISCORD_CHANNEL: state.discordChannelId, DISCORD_MESSAGE: state.discordMessageId, DISCORD_ENABLED: state.discordEnabled }
    }
    axios.post(`https://bot.cryptopositionsbot.com/userDiscordInfo`, data).then((response) => {
      if (response.data === true) {
        state.userInfo.DISCORD_CHANNEL = state.discordChannelId;
        state.userInfo.DISCORD_MESSAGE = state.discordMessageId;
        state.userInfo.DISCORD_ENABLED = state.discordEnabled;
        notify("Updated user discord info", 'success');
      } else {
        notify("Failed to update user discord info", 'error');
      }

      resolve()
    }).catch(error => {
      notify("Failed to update user discord info", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const updateUserTwitchInfo = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token,
      twitchInfo: { TWITCH_ENABLED: state.twitchEnabled, TWITCH_TIMEOUT: state.twitchTimeoutEnabled, TWITCH_TIMEOUT_EXPIRE: state.twitchTimeoutLength }
    }
    axios.post(`https://bot.cryptopositionsbot.com/userTwitchInfo`, data).then((response) => {
      if (response.data === true) {
        notify("Updated user twitch info", 'success');
        state.userInfo.TWITCH_ENABLED = state.twitchEnabled;
        state.userInfo.TWITCH_TIMEOUT = state.twitchTimeoutEnabled;
        state.userInfo.TWITCH_TIMEOUT_EXPIRE = state.twitchTimeoutLength;
        isConnectedToTwitchChannel().then(() => {
          resolve()
        }).catch(error => {
          console.error(error);
          reject(error);
        })
      } else {
        notify("Failed to update user twitch info", 'error');
      }
    }).catch(error => {
      notify("Failed to update user twitch info", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const updateEnabledState = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token,
      enabled: state.enabled
    }
    axios.post('https://bot.cryptopositionsbot.com/userEnabled', data).then((response) => {
      if (response.data === true) {
        state.userInfo.ENABLED = state.enabled;
        notify("Updated user enabled state", 'success');
      } else {
        notify("Failed to update user enabled state", 'error');
      }
      resolve()
    }).catch(error => {
      notify("Failed to update user enabled state", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const logout = () => {
  state.userInfo = null
  state.twitchUserInfo = null
  notify("Logged out", 'success');
}

const deleteUser = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token
    }
    axios.post('https://bot.cryptopositionsbot.com/removeUser', data).then((response) => {
      state.deleteDialog = false;
      logout()
      resolve()
    }).catch(error => {
      console.error(error);
      reject(error);
    })
  })
}

const start = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token
    }
    axios.post('https://bot.cryptopositionsbot.com/start', data).then((response) => {
      if (response.data === true) {
        state.userInfo.IS_RUNNING = true;
        state.startDialog = false;
        notify("Started the bot!", 'success');
      } else {
        notify("Failed to start!", 'error');
      }
      resolve()
    }).catch(error => {
      notify("Failed to start!", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const stop = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token
    }
    axios.post('https://bot.cryptopositionsbot.com/stop', data).then((response) => {
      if (response.data === true) {
        state.userInfo.IS_RUNNING = false;
        state.stopDialog = false;
        notify("Stopped the bot!", 'success');
      } else {
        notify("Failed to stop!", 'error');
      }
      resolve()
    }).catch(error => {
      notify("Failed to stop!", 'error');
      console.error(error);
      reject(error);
    })
  })
}

const connectToTwitchChannel = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    isConnectedToTwitchChannel().then((connected) => {
      if (!connected) {
        let data = {
          access_token: state.twitchAccessToken.access_token
        }
        axios.post('https://bot.cryptopositionsbot.com/connectToTwitchChannel', data).then((response) => {
          if (response.data === true) {
            state.connectedToTwitchChannel = true;
            notify('Bot connected to twich channel chat', 'success')
          } else {
            notify(response.data, 'error')
          }
          resolve(response.data)
        }).catch(error => {
          console.error(error);
          reject(error);
        })
      } else {
        notify("Already connected to Twitch Channel", 'error');
      }
    })
  })
}

const disconnectFromTwitchChannel = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    isConnectedToTwitchChannel().then((connected) => {
      if (connected) {
        let data = {
          access_token: state.twitchAccessToken.access_token
        }
        axios.post('https://bot.cryptopositionsbot.com/disconnectFromTwitchChannel', data).then((response) => {
          if (response.data === true) {
            state.connectedToTwitchChannel = false;
            notify('Bot disconnected from twich channel chat', 'success')
          } else {
            notify(response.data, 'error')
          }
        }).catch(error => {
          console.error(error);
          reject(error);
        })
      } else {
        notify("Not connected to Twitch Channel", 'error');
      }
    })
  })
}

const isConnectedToTwitchChannel = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    axios.get(`https://bot.cryptopositionsbot.com/isConnectedToTwitchChannel?access_token=${state.twitchAccessToken.access_token}`).then((response) => {
      state.connectedToTwitchChannel = response.data;
      resolve(response.data)
    }).catch(error => {
      console.error(error);
      reject(error);
    })
  })
}

const notify = (message: string, type: AlertType) => {
  state.alert.message = message;
  state.alert.type = type;
  state.alert.show = true;
  if (state.alert.timeout) {
    clearTimeout(state.alert.timeout)
  }
  state.alert.timeout = setTimeout(() => {
    state.alert.show = false;
  }, 2500)
}

const confirm = (message: string) => {
  return window.confirm(message);
}

interface User {
  ID: string
  EXCHANGE_KEYS: Array<ExchangeKey>
  DISCORD_CHANNEL: string
  DISCORD_MESSAGE: string
  TWITCH_CHANNEL: string
  TWITCH_ENABLED: boolean
  TWITCH_TIMEOUT: boolean
  TWITCH_TIMEOUT_EXPIRE: number
  DISCORD_ENABLED: boolean
  LAST_UPDATE: string
  ENABLED: boolean
  IS_RUNNING: boolean
}

interface ExchangeKey {
  KEY_ID: string
  EXCHANGE_ID: string
  API_KEY: string
  API_SECRET: string
  DESCRIPTION: string
}

interface TwitchUserInfo {
  id: string
  ligin: string
  display_name: string
  type: string
  broadcaster_type: string
  description: string
  profile_image_url: string
  view_count: number
  email?: string
  created_at: string
}
</script>
