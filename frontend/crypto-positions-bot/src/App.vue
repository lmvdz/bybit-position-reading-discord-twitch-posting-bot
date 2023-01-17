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

    <v-alert closable v-model="state.alert.show" :type="state.alert.type"
      :style="`${state.twitchExtensionEnabled ? 'bottom: 0px; left: -1em; right: 0px; width: 100%;' : 'left: 5%; top: 0px; width: 90%;'} z-index: 5000; position: absolute; margin: 1em; `"
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

    <v-dialog v-model="setRefDialog">
      <div class="d-flex align-top justify-center">
        <v-card style="width: 400px">
          <v-card-title>Set Referral?</v-card-title>
          <v-card-subtitle>#{{ refLink }}</v-card-subtitle>
          <v-card-actions>
            <v-btn variant="outlined" @click="setupRefLink()" color="success">Confirm</v-btn>
            <v-btn variant="outlined" @click="cancelRefLink()">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <v-app-bar color="teal-darken-4" :style="`width: 250px; border-radius: 0 0 30px 0;`" :elevation="0"
      v-if="(state.twitchExtensionEnabled && state.twitchUserInfo !== null && state.userInfo !== null && state.userInfo.ENABLED !== undefined && state.userInfo.ENABLED)">

      <template v-slot:image>
        <v-img gradient="to top right, rgba(25,25,25,.8), rgba(50,50,50,.8)"></v-img>
      </template>
      <!-- <v-avatar style="margin-top: 1em; cursor: pointer;" :color="`grey-darken-1`"
        :image="state.twitchUserInfo !== null ? state.twitchUserInfo.profile_image_url : ''" :size="36" @click="() => {
          if (state.twitchUserInfo !== null) {
            state.logoutDialog = true;
          }
        }" class="d-block text-center mx-auto mb-9"></v-avatar> -->


      <v-tooltip text="Twitch Info" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn style="margin-right: 1em;" v-bind="props" key="chat" icon v-if="state.twitchUserInfo !== null"
            :active="state.editTwitchInfo" flat :color="state.editTwitchInfo ? 'success' : 'warning'"
            @click="state.editTwitchInfo = !state.editTwitchInfo; state.editDiscordInfo = false; state.editExchangeKeys = false;">
            <v-img style="width: 28px; height: 28px" :src="twitchImage"></v-img>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Discord Info" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn style="margin-right: 1em;" v-bind="props" key="forum" icon v-if="state.twitchUserInfo !== null"
            :active="state.editDiscordInfo" flat :color="state.editDiscordInfo ? 'success' : 'warning'"
            @click="state.editDiscordInfo = !state.editDiscordInfo; state.editExchangeKeys = false; state.editTwitchInfo = false;">
            <v-img style="width: 28px; height: 28px" :src="discordImage"></v-img>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Exchange Keys" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn style="margin-right: 1em;" v-bind="props" key="key" icon v-if="state.twitchUserInfo !== null"
            :active="state.editExchangeKeys" flat size="32px" :color="state.editExchangeKeys ? 'success' : 'warning'"
            @click="state.editExchangeKeys = !state.editExchangeKeys; state.editDiscordInfo = false; state.editTwitchInfo = false;">
            <v-icon>mdi-key</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Copy Ref Link" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" size="32px" variant="plain" icon="mdi-share" color="success"
            @click="copyRefLink()"></v-btn>
        </template>
      </v-tooltip>

    </v-app-bar>

    <v-navigation-drawer app model-value class="pt-4" rail
      v-if="state.twitchUserInfo !== null && !state.twitchExtensionEnabled" permanent>
      <v-avatar style="margin-top: 1em; cursor: pointer;" :color="`grey-darken-1`"
        :image="state.twitchUserInfo !== null ? state.twitchUserInfo.profile_image_url : ''" :size="36" @click="() => {
          if (state.twitchUserInfo !== null) {
            state.logoutDialog = true;
          }
        }" class="d-block text-center mx-auto mb-9"></v-avatar>
      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>



      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null"
        :active="state.editTwitchInfo" flat class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-chat"
        @click="state.editTwitchInfo = !state.editTwitchInfo; state.editDiscordInfo = false; state.editExchangeKeys = false;">
        <v-img style="width: 32px; height: 32px" :src="twitchImage"></v-img>
      </v-btn>

      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null"
        :active="state.editDiscordInfo" flat class="d-block text-center mx-auto mb-9" size="32px" icon
        @click="state.editDiscordInfo = !state.editDiscordInfo; state.editTwitchInfo = false; state.editExchangeKeys = false;">
        <v-img :style="`width: 32px; height: 32px;`" :src="discordImage"></v-img>
      </v-btn>

      <v-divider v-if="state.twitchUserInfo !== null"></v-divider>
      <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null"
        :active="state.editExchangeKeys" flat class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-key"
        @click="state.editExchangeKeys = !state.editExchangeKeys; state.editTwitchInfo = false; state.editDiscordInfo = false;">
      </v-btn>

      <!-- <v-btn variant="plain" style="margin-top: 2em;" v-if="state.twitchUserInfo !== null" :active="state.deleteDialog" flat
        color="error" class="d-block text-center mx-auto mb-9" size="32px" icon="mdi-trash-can"
        @click="state.deleteDialog = !state.deleteDialog;" />
      <v-divider></v-divider> -->

    </v-navigation-drawer>

    <v-main>
      <v-container class="fill-height">
        <v-responsive class="d-flex align-center text-center justify-center fill-height">
          <!-- <v-img contain height="300" src="src/assets/logo.svg" /> -->

          <!-- <div class="text-body-2 font-weight-light mb-n1">Welcome to</div> -->

          <h1 v-if="(state.twitchUserInfo === null)" class="text-h3 font-weight-bold">CryptoPositionsBot</h1>

          <h2 class="text-h4 font-weight-bold" v-if="(state.twitchUserInfo !== null && !state.twitchExtensionEnabled)"
            style="color: rgb(169, 94, 171)">
            Logged In As: {{ state.twitchUserInfo.display_name }} <v-btn size="x-small" variant="plain" icon="mdi-share"
              color="success" @click="copyRefLink()"></v-btn></h2>
          <h3 class="text-h5 font-weight-bold"
            v-if="state.userInfo !== null && state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== '' && (!state.twitchExtensionEnabled || (state.twitchExtensionEnabled && !state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys))"
            style="color: rgb(148 143 149)">Referred By: {{ state.userInfo.REF_LINK }}</h3>
          <v-text-field
            v-if="(state.userInfo === null && state.twitchUserInfo === null) || (state.userInfo !== null && !(state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== ''))"
            style="margin: 2em auto 0 auto; max-width: 300px;" variant="underlined" persistent-hint
            :hint="state.userInfo !== null ? state.refLink.toLowerCase() === state.userInfo.TWITCH_CHANNEL.substring(1).toLowerCase() ? 'Can not refer yourself.' : 'Can not be changed once set.' : ''"
            label="Referred By (Twitch Username)" v-model="state.refLink">
            <template v-slot:append-inner
              v-if="(state.userInfo !== null && !(state.userInfo.REF_LINK !== null && state.userInfo.REF_LINK !== undefined && state.userInfo.REF_LINK !== ''))">
              <v-btn
                :disabled="state.refLink === '' || state.refLink === null || state.refLink === undefined || state.refLink.toLowerCase() === state.userInfo.TWITCH_CHANNEL.substring(1).toLowerCase()"
                @click="trySetupRefLink(state.refLink)" variant="text" icon="mdi-content-save" color="success"></v-btn>
            </template>
          </v-text-field>

          <div class="py-5"
            v-if="(!state.twitchExtensionEnabled || (state.twitchExtensionEnabled && !state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys))" />

          <v-row class="d-flex align-top justify-center" v-if="state.twitchUserInfo === null">
            <v-col cols="auto">
              <!-- {{twitchUserInfo}} -->
              <v-btn variant="outlined" @click="connectTwitch" color="rgb(169, 94, 171)">Connect Twitch</v-btn>
            </v-col>
          </v-row>


          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null && (!state.twitchExtensionEnabled || (state.twitchExtensionEnabled && !state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys))">
            <v-col cols="auto">
              <div v-if="!state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys">
                <v-checkbox :label="(() => {
                  if (state.userInfo.ENABLED) {
                    if (state.enabled === state.userInfo.ENABLED) {
                      return `Account is Enabled`
                    } else {
                      return 'Press Save to Disable'
                    }
                  } else {
                    if (state.enabled === state.userInfo.ENABLED) {
                      return `Account is Disabled`
                    } else {
                      return 'Press Save to Enable'
                    }
                  }
                })()" v-model="state.enabled"></v-checkbox>
                <v-btn variant="outlined" color="success" v-if="state.enabled !== state.userInfo.ENABLED"
                  @click="updateEnabledState()">Save
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null && (!state.twitchExtensionEnabled || (state.twitchExtensionEnabled && !state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys))">
            <v-col cols="auto">
              <div v-if="!state.editDiscordInfo && !state.editTwitchInfo && !state.editExchangeKeys">
                <v-tooltip
                  :text="`${state.userInfo.IS_RUNNING ? 'Stop Bot from pulling data' : 'Start Bot from pulling data'}`"
                  location="bottom">
                  <template v-slot:activator="{ props }">
                    <!-- <v-btn style="margin-right: 1em;" v-bind="props" key="chat" icon v-if="state.twitchUserInfo !== null" :active="state.editTwitchInfo" flat size="32px" :color="state.editTwitchInfo ? 'success' : 'warning'" @click="state.editTwitchInfo = !state.editTwitchInfo">
                      <v-icon>mdi-chat</v-icon> 
                    </v-btn> -->

                    <v-btn v-bind="props" variant="outlined"
                      :icon="!state.userInfo.IS_RUNNING ? 'mdi-play' : 'mdi-stop'" :disabled="!state.enabled"
                      :color="state.userInfo.IS_RUNNING ? 'error' : 'success'" v-if="state.twitchUserInfo !== null"
                      @click="() => {
                        if (state.userInfo.IS_RUNNING) {
                          stopDialog = true;
                        } else {
                          startDialog = true;
                        }
                      }">
                    </v-btn>
                  </template>
                </v-tooltip>
              </div>
            </v-col>
          </v-row>

          <v-row class="d-flex align-top justify-center"
            v-if="state.twitchUserInfo !== null && state.userInfo !== null">
            <v-col cols="auto" :style="state.twitchExtensionEnabled ? 'width: 100%' : ''" v-if="state.editExchangeKeys">
              <div
                :style="`${state.twitchExtensionEnabled ? '' : 'margin-top: 1em;'} padding: 1em; ${state.twitchExtensionEnabled ? 'background-color: rgba(255, 255, 255, 0.01)' : ''}`"
                class="overflow-y-auto" v-if="state.editExchangeKeys">
                <h3>Exchange Keys</h3>
                <p style="margin-top: 1em;" v-for="(exchangeKey, index) in state.exchangeKeys"
                  :key="'exchangeKey-' + index">
                <p style="margin-bottom: 1em;">#{{ index + 1 }} - {{ exchangeKey.EXCHANGE_ID }} <v-icon
                    :style="!state.enabled ? 'cursor: default;' : 'cursor: pointer;'"
                    @click="state.enabled ? state.exchangeKeyOpen[index] = !state.exchangeKeyOpen[index] : ''">{{
                        state.exchangeKeyOpen[index] === true ? 'mdi-chevron-down' : 'mdi-chevron-up'
                    }}</v-icon></p>
                <div v-if="state.exchangeKeyOpen[index]">
                  <v-autocomplete :disabled="!enabled" variant="underlined" style="height: auto" density="compact"
                    label="EXCHANGE" :items="validExchanges" v-model="exchangeKey.EXCHANGE_ID"></v-autocomplete>
                  <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="DESCRIPTION"
                    v-model="exchangeKey.DESCRIPTION"></v-text-field>
                  <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="API KEY"
                    v-model="exchangeKey.API_KEY" type="password"></v-text-field>
                  <v-text-field :disabled="!enabled" variant="underlined" density="compact" label="API SECRET"
                    v-model="exchangeKey.API_SECRET" type="password"></v-text-field>
                  <v-btn variant="outlined" :disabled="!enabled"
                    :style="`margin-bottom: 2em; ${state.twitchExtensionEnabled ? 'font-size: .75em' : ''}`"
                    color="error" @click="() => { state.exchangeKeys.splice(index, 1) }">Remove Exchange API Key #{{
                        index + 1
                    }}
                  </v-btn>
                </div>
                <v-divider></v-divider>
                </p>
                <p class="d-flex align-top justify-center" style="margin-top: .5em;">
                  <v-btn variant="outlined" :disabled="!enabled" color="primary" @click="() => {
                    state.exchangeKeyOpen[state.exchangeKeys.push({ KEY_ID: uuidv4(), EXCHANGE_ID: '', API_KEY: '', API_SECRET: '', DESCRIPTION: '' }) - 1] = true;
                  }">
                    Add Exchange API Key</v-btn>
                </p>
              </div>
              <div v-if="editExchangeKeys">
                <p style="margin-top: 1em;">

                  <v-btn variant="outlined" :disabled="!state.enabled || exchangeKeysHash === computedExchangeKeysHash"
                    style="margin: .25em;" color="success" @click="updateUserExchangeKeys()">Save Exchange Keys</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled"
                    v-if="state.exchangeKeys.length !== state.userInfo.EXCHANGE_KEYS.length || exchangeKeysHash !== computedExchangeKeysHash"
                    style="margin: .25em;" color="error" @click="cancelExchangeKeyChanges()">Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" v-else style="margin: .25em;" color="error"
                    @click="state.editExchangeKeys = !state.editExchangeKeys">Close</v-btn>
                </p>
              </div>
            </v-col>
            <v-col cols="auto" :style="state.twitchExtensionEnabled ? 'width: 100%' : ''" v-if="state.editDiscordInfo">
              <div
                :style="`margin-top: 1em; min-width: ${state.twitchExtensionEnabled ? '0' : '400px'}; padding: 1em;`"
                class="overflow-y-auto" v-if="state.editDiscordInfo">
                <h3>Discord Settings</h3>
                <v-checkbox :disabled="!state.enabled" label="Discord Enabled" v-model="state.discordEnabled" />
                <div style="margin-bottom: 2em;">
                  <v-btn :disabled="!state.enabled" color="primary" target="_blank" variant="outlined"
                    href="https://bot.cryptopositions.bot/discord-bot-invite">Invite
                    Discord Bot</v-btn>
                </div>

                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact"
                  label="Discord Channel ID" v-model="state.discordChannelId"></v-text-field>
                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact"
                  label="Discord Message ID" v-model="state.discordMessageId"></v-text-field>
                <v-autocomplete multiple chips variant="underlined" density="compact" label="Discord Shared Properties" :items="sharedProperties"
                  v-model="state.discordSharedProperties"></v-autocomplete>
                <p>
                  <v-btn variant="outlined" style="margin: .25em;" color="success" @click="updateUserDiscordInfo()"
                    :disabled="!state.enabled || !(state.discordEnabled !== state.userInfo.DISCORD_ENABLED || state.discordChannelId !== state.userInfo.DISCORD_CHANNEL || state.discordMessageId !== state.userInfo.DISCORD_MESSAGE || state.discordSharedProperties.length !== state.userInfo.DISCORD_SHARED_PROPERTIES.length || discordSharedPropertiesHash !== computedDiscordSharedPropertyHash)">
                    Save</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="cancelDiscordChanges()"
                    v-if="state.discordEnabled !== state.userInfo.DISCORD_ENABLED || state.discordChannelId !== state.userInfo.DISCORD_CHANNEL || state.discordMessageId !== state.userInfo.DISCORD_MESSAGE || state.discordSharedProperties.length !== state.userInfo.DISCORD_SHARED_PROPERTIES.length || discordSharedPropertiesHash !== computedDiscordSharedPropertyHash">
                    Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="state.editDiscordInfo = !state.editDiscordInfo"
                    v-if="state.discordEnabled === state.userInfo.DISCORD_ENABLED && state.discordChannelId === state.userInfo.DISCORD_CHANNEL && state.discordMessageId === state.userInfo.DISCORD_MESSAGE && state.discordSharedProperties.length === state.userInfo.DISCORD_SHARED_PROPERTIES.length && discordSharedPropertiesHash === computedDiscordSharedPropertyHash">
                    Close</v-btn>
                </p>
              </div>
            </v-col>
            <v-col cols="auto" :style="state.twitchExtensionEnabled ? 'width: 100%' : ''" v-if="state.editTwitchInfo">
              <div
                :style="`margin-top: 1em; min-width: ${state.twitchExtensionEnabled ? '0' : '400px'}; padding: 1em;`"
                class="overflow-y-auto" v-if="state.editTwitchInfo">
                <h3>Twitch Settings</h3>
                <v-checkbox :disabled="!state.enabled" label="Twitch Enabled" v-model="twitchEnabled" />
                <v-checkbox :disabled="!state.enabled" label="Timeout Enabled" v-model="twitchTimeoutEnabled" />
                <div>
                  <v-btn color="primary" style="margin-bottom: 2em;" variant="outlined"
                    v-if="!state.connectedToTwitchChannel" @click="connectToTwitchChannel()">Connect To Twitch Channel
                  </v-btn>
                  <v-btn :disabled="!state.enabled" color="error"
                    :style="`margin-bottom: 2em; ${state.twitchExtensionEnabled ? 'font-size: .75em' : ''}`"
                    variant="outlined" v-else @click="disconnectFromTwitchChannel()">Disconnect Twitch Channel
                  </v-btn>
                </div>

                <v-text-field :disabled="!state.enabled" variant="underlined" density="compact" type="number"
                  label="Command Timeout Length (minutes)" v-model="state.twitchTimeoutLength" />
                <v-autocomplete multiple chips variant="underlined" density="compact" label="Twitch Shared Properties" :items="sharedProperties"
                  v-model="state.twitchSharedProperties"></v-autocomplete>
                <p>
                  <v-btn variant="outlined" style="margin: .25em;" color="success" @click="updateUserTwitchInfo()"
                    :disabled="!state.enabled || !(state.twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString()) || state.twitchSharedProperties.length !== state.userInfo.TWITCH_SHARED_PROPERTIES.length || twitchSharedPropertiesHash !== computedTwitchSharedPropertyHash)">
                    Save</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="cancelTwitchChanges()"
                    v-if="state.twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString()) || state.twitchSharedProperties.length !== state.userInfo.TWITCH_SHARED_PROPERTIES.length || twitchSharedPropertiesHash !== computedTwitchSharedPropertyHash">
                    Cancel</v-btn>
                  <v-btn variant="outlined" :disabled="!state.enabled" style="margin: .25em;" color="error"
                    @click="state.editTwitchInfo = !state.editTwitchInfo"
                    v-if="!(twitchEnabled !== userInfo.TWITCH_ENABLED || twitchTimeoutEnabled !== userInfo.TWITCH_TIMEOUT || Number.parseFloat(twitchTimeoutLength.toString()) !== Number.parseFloat(userInfo.TWITCH_TIMEOUT_EXPIRE.toString()) || state.twitchSharedProperties.length !== state.userInfo.TWITCH_SHARED_PROPERTIES.length || twitchSharedPropertiesHash !== computedTwitchSharedPropertyHash)">
                    Close</v-btn>
                </p>
              </div>
            </v-col>
          </v-row>

        </v-responsive>
      </v-container>

    </v-main>

    <v-footer app style="max-height: 1.5em;" v-if="!state.twitchExtensionEnabled">
      CryptoPositionsBot 2022
    </v-footer>
  </v-app>

</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue';
import axios from 'axios'
//@ts-ignore
import { v4 as uuidv4 } from 'uuid'
import validExchanges from './exchanges';
import { computed } from '@vue/reactivity';

type AlertType = "success" | "error" | "warning" | "info" | undefined

const twitchImage = new URL('./assets/TwitchGlitchBlackOps.png', import.meta.url).href
const discordImage = new URL('./assets/discord-mark-white.png', import.meta.url).href

const alert = ref<{
  show: boolean,
  message: string,
  type: AlertType
  timeout: NodeJS.Timer | null
}>({ show: false, message: '', type: 'success', timeout: null })
const twitchExtensionEnabled = ref<boolean>(false);

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
const editExchangeKeys = ref<boolean>(false);
const editDiscordInfo = ref<boolean>(false);
const deleteDialog = ref<boolean>(false);
const logoutDialog = ref<boolean>(false);
const startDialog = ref<boolean>(false);
const stopDialog = ref<boolean>(false);
const setRefDialog = ref<boolean>(false);
const editTwitchInfo = ref<boolean>(false);
const discordChannelId = ref<string>('');
const discordMessageId = ref<string>('');
const enabled = ref<boolean>(false);
const discordEnabled = ref<boolean>(false);
const twitchEnabled = ref<boolean>(false);
const twitchTimeoutEnabled = ref<boolean>(false);
const twitchTimeoutLength = ref<number>(5);
const twitchSharedProperties = ref<Array<SharedProperty>>(new Array<SharedProperty>());
const twitchSharedPropertiesHash = ref<string>('');
const computedTwitchSharedPropertyHash = computed(() => {
  return Buffer.from(JSON.stringify(twitchSharedProperties.value), 'utf-8').toString('base64')
})
const discordSharedProperties = ref<Array<SharedProperty>>(new Array<SharedProperty>());
const discordSharedPropertiesHash = ref<string>('');
const computedDiscordSharedPropertyHash = computed(() => {
  return Buffer.from(JSON.stringify(discordSharedProperties.value), 'utf-8').toString('base64')
})
const connectedToTwitchChannel = ref<boolean>(false);
const exchangeKeyOpen = ref<Array<boolean>>(new Array<boolean>());

const userInfo = ref<any>(null);

const state = reactive({
  twitchExtensionEnabled,
  alert,
  copiedRefLink,
  refLink,
  referrals,
  exchangeKeys,
  exchangeKeyOpen,
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
  twitchSharedProperties,
  discordSharedProperties,
  userInfo,
  setRefDialog,
  deleteDialog,
  logoutDialog,
  startDialog,
  stopDialog,
  connectedToTwitchChannel
})

//@ts-ignore
window.Twitch.ext.onAuthorized((auth: any) => {
  state.twitchAccessToken = {
    access_token: auth.helixToken,
    client_id: auth.clientId,
    channel_id: auth.channelId,
    token: auth.token,
    user_id: auth.userId.substring(1)
  }
  state.twitchExtensionEnabled = true;
});

watch(() => [state.twitchExtensionEnabled, state.twitchAccessToken], (current, old) => {

  if (current[0] && current[1] !== null && current[1] !== undefined) {
    state.editDiscordInfo = false;
    state.editExchangeKeys = false;
    state.editTwitchInfo = false;
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
})


const log = (...args: any) => {
  console.log(...args)
}

const connectTwitch = () => {
  if (state.twitchExtensionEnabled) {
    state.editDiscordInfo = false;
    state.editExchangeKeys = false;
    state.editTwitchInfo = false;
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
  } else if (window.location.host !== 'localhost:3000' && window.location.host !== '127.0.0.1:3000') {
    window.location.href = (`https://bot.cryptopositionsbot.com/login?redirect_uri=https://www.cryptopositionsbot.com/&state=${state.refLink}`)
  } else {
    window.location.href = (`http://localhost:3216/login?redirect_uri=https://localhost:3000/&state=${state.refLink}`)
  }
}

const backend = computed(() => {
  if (window.location.host !== 'localhost:3000' && window.location.host !== '127.0.0.1:3000') {
    return `https://bot.cryptopositionsbot.com`
  } else {
    return `http://localhost:3216`
  }
})

const frontend = computed(() => {
  if (window.location.host !== 'localhost:3000' && window.location.host !== '127.0.0.1:3000') {
    return `https://www.cryptopositionsbot.com`
  } else {
    return `https://localhost:3000`
  }
})

const copyRefLink = () => {
  navigator.clipboard.writeText(`${frontend.value}/?ref=${state.userInfo.TWITCH_CHANNEL.toLowerCase().substring(1)}`);
  notify("Copied ref link to clipboard", 'success')
}

onMounted(() => {

  if (document.location.hash && !state.twitchExtensionEnabled) {
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
    axios.get(`${backend.value}/twitchUserInfo?access_token=${state.twitchAccessToken.access_token}&is_helix=${state.twitchExtensionEnabled}&client_id=${state.twitchAccessToken.client_id}&user_id=${state.twitchAccessToken.user_id}`).then((response) => {
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
    axios.get(`${backend.value}/userInfo?access_token=${state.twitchAccessToken.access_token}&is_helix=${state.twitchExtensionEnabled}&client_id=${state.twitchAccessToken.client_id}&user_id=${state.twitchAccessToken.user_id}`).then((response) => {
      exchangeKeysHash.value = Buffer.from(JSON.stringify(response.data.EXCHANGE_KEYS), 'utf-8').toString('base64')
      twitchSharedPropertiesHash.value = Buffer.from(JSON.stringify(response.data.TWITCH_SHARED_PROPERTIES), 'utf-8').toString('base64')
      discordSharedPropertiesHash.value = Buffer.from(JSON.stringify(response.data.DISCORD_SHARED_PROPERTIES), 'utf-8').toString('base64')
      state.userInfo = response.data;
      if (state.userInfo.EXCHANGE_KEYS.length > 0) {
        state.exchangeKeys.push(...response.data.EXCHANGE_KEYS);
      }
      if (state.userInfo.TWITCH_SHARED_PROPERTIES.length > 0) {
        state.twitchSharedProperties.push(...response.data.TWITCH_SHARED_PROPERTIES);
      }
      if (state.userInfo.DISCORD_SHARED_PROPERTIES.length > 0) {
        state.discordSharedProperties.push(...response.data.DISCORD_SHARED_PROPERTIES);
      }
      state.discordChannelId = response.data.DISCORD_CHANNEL;
      state.discordMessageId = response.data.DISCORD_MESSAGE;
      state.discordEnabled = response.data.DISCORD_ENABLED;
      state.twitchEnabled = response.data.TWITCH_ENABLED;
      state.twitchTimeoutEnabled = response.data.TWITCH_TIMEOUT;
      state.twitchTimeoutLength = response.data.TWITCH_TIMEOUT_EXPIRE;
      state.enabled = response.data.ENABLED;
      state.refLink = response.data.REF_LINK || '';
      if (
        (state.refLink === null || state.refLink === undefined || state.refLink === '') &&
        state.twitchAccessToken.state !== '' && state.twitchAccessToken.state !== 'undefined' && state.twitchAccessToken.state !== undefined && state.twitchAccessToken.state !== null
      ) {
        if (state.twitchAccessToken.state.toLowerCase() !== state.userInfo.TWITCH_CHANNEL.toLowerCase().substring(1)) {
          trySetupRefLink(state.twitchAccessToken.state)
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

const setupRefLink = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    axios.post(`${backend.value}/trySetupRefLink`, { access_token: state.twitchAccessToken.access_token, client_id: state.twitchAccessToken.client_id, refLink: state.refLink, is_helix: state.twitchExtensionEnabled, user_id: state.twitchAccessToken.user_id }).then((response) => {
      if (response.data === true) {
        state.userInfo.REF_LINK = state.refLink
        state.setRefDialog = false;
        notify('Ref Link connected to ' + state.refLink, 'success')
        resolve();
      } else {
        console.error(response.data);
        notify(response.data, 'error')
        state.refLink = ''
        state.setRefDialog = false;
        resolve();
      }
    }).catch(error => {
      console.error(error);
      reject(error);
    })
  })
}

const trySetupRefLink = (refLink: string) : void => {
  state.refLink = refLink;
  state.setRefDialog = true;
}

const cancelRefLink = () => {
  state.refLink = '';
  state.setRefDialog = false;
}

const getReferrals = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    axios.get(`${backend.value}/referrals?access_token=${state.twitchAccessToken.access_token}&is_helix=${state.twitchExtensionEnabled}&client_id=${state.twitchAccessToken.client_id}&user_id=${state.twitchAccessToken.user_id}`).then((response) => {
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
  if (state.userInfo.EXCHANGE_KEYS.length > 0 || state.exchangeKeys.length > 0) {
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
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
      exchangeKeys: state.exchangeKeys
    }
    axios.post(`${backend.value}/userExchangeKeys`, data).then((response) => {
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
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
      discordInfo: { DISCORD_CHANNEL: state.discordChannelId, DISCORD_MESSAGE: state.discordMessageId, DISCORD_ENABLED: state.discordEnabled, DISCORD_SHARED_PROPERTIES: state.discordSharedProperties }
    }
    axios.post(`${backend.value}/userDiscordInfo`, data).then((response) => {
      if (response.data === true) {
        state.userInfo.DISCORD_CHANNEL = state.discordChannelId;
        state.userInfo.DISCORD_MESSAGE = state.discordMessageId;
        state.userInfo.DISCORD_ENABLED = state.discordEnabled;
        state.userInfo.DISCORD_SHARED_PROPERTIES = state.discordSharedProperties;
        discordSharedPropertiesHash.value = Buffer.from(JSON.stringify(state.discordSharedProperties), 'utf-8').toString('base64')
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
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
      twitchInfo: { TWITCH_ENABLED: state.twitchEnabled, TWITCH_TIMEOUT: state.twitchTimeoutEnabled, TWITCH_TIMEOUT_EXPIRE: state.twitchTimeoutLength, TWITCH_SHARED_PROPERTIES: state.twitchSharedProperties }
    }
    axios.post(`${backend.value}/userTwitchInfo`, data).then((response) => {
      if (response.data === true) {
        notify("Updated user twitch info", 'success');
        state.userInfo.TWITCH_ENABLED = state.twitchEnabled;
        state.userInfo.TWITCH_TIMEOUT = state.twitchTimeoutEnabled;
        state.userInfo.TWITCH_TIMEOUT_EXPIRE = state.twitchTimeoutLength;
        state.userInfo.TWITCH_SHARED_PROPERTIES = state.twitchSharedProperties;
        twitchSharedPropertiesHash.value = Buffer.from(JSON.stringify(state.twitchSharedProperties), 'utf-8').toString('base64')
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
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
      enabled: state.enabled
    }
    axios.post(`${backend.value}/userEnabled`, data).then((response) => {
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
  state.alert.show = false;
  state.refLink = '';
  state.connectedToTwitchChannel = false;
  notify("Logged out", 'success');
  state.logoutDialog = false;
}

const deleteUser = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let data = {
      access_token: state.twitchAccessToken.access_token,
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
    }
    axios.post(`${backend.value}/removeUser`, data).then((response) => {
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
      access_token: state.twitchAccessToken.access_token,
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
    }
    axios.post(`${backend.value}/start`, data).then((response) => {
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
      access_token: state.twitchAccessToken.access_token,
      is_helix: state.twitchExtensionEnabled,
      client_id: state.twitchAccessToken.client_id,
      user_id: state.twitchAccessToken.user_id,
    }
    axios.post(`${backend.value}/stop`, data).then((response) => {
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
      if (connected) {
        notify("Already connected to Twitch Channel", 'error');
        return;
      }
      let data = {
        access_token: state.twitchAccessToken.access_token,
        is_helix: state.twitchExtensionEnabled,
        client_id: state.twitchAccessToken.client_id,
        user_id: state.twitchAccessToken.user_id
      }
      axios.post(`${backend.value}/connectToTwitchChannel`, data).then((response) => {
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
    })
  })
}

const disconnectFromTwitchChannel = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    isConnectedToTwitchChannel().then((connected) => {
      if (connected) {
        let data = {
          access_token: state.twitchAccessToken.access_token,
          is_helix: state.twitchExtensionEnabled,
          client_id: state.twitchAccessToken.client_id,
          user_id: state.twitchAccessToken.user_id
        }
        axios.post(`${backend.value}/disconnectFromTwitchChannel`, data).then((response) => {
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
    axios.get(`${backend.value}/isConnectedToTwitchChannel?access_token=${state.twitchAccessToken.access_token}&is_helix=${state.twitchExtensionEnabled}&client_id=${state.twitchAccessToken.client_id}&user_id=${state.twitchAccessToken.user_id}`).then((response) => {
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
  DISCORD_SHARED_PROPERTIES: Array<SharedProperty>
  TWITCH_CHANNEL: string
  TWITCH_ENABLED: boolean
  TWITCH_TIMEOUT: boolean
  TWITCH_TIMEOUT_EXPIRE: number
  TWITCH_SHARED_PROPERTIES: Array<SharedProperty>
  DISCORD_ENABLED: boolean
  LAST_UPDATE: string
  ENABLED: boolean
  REF_LINK: string
  IS_RUNNING: boolean
}

type SharedProperty = "pnl" | "liq" | "entry" | "size" | 'mark';

const sharedProperties = [{title: "Unrealized PnL", value: "pnl"}, {title: "Liquidation Price", value: "liq"}, {title: "Entry Price", value: "entry"}, {title: "Position Size", value: "size"}, {title: "Mark Price", value: "mark"}];

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

<style>
/* ===== Scrollbar CSS ===== */
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #636363 #121212;
}

/* Chrome, Edge, and Safari */
*::-webkit-scrollbar {
  width: 12px;
}

*::-webkit-scrollbar-track {
  background: #121212;
}

*::-webkit-scrollbar-thumb {
  background-color: #636363;
  border-radius: 10px;
  border: 3px solid #121212;
}
</style>