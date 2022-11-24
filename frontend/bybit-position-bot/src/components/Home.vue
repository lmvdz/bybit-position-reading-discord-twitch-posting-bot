<script setup lang="ts">
import { reactive, ref } from 'vue';
const modalState = reactive({ showModal: false, login: false, signup: false });
const exchangeKeys = reactive<Array<ExchangeKey>>([])
const handleCloseDialog = () => {
    modalState.showModal = false;
}
const login = () => {

}
const signup = () => {

}
const connectTwitch = () => {

}
</script>

<template>
    <v-container class="fill-height">
        <v-responsive class="d-flex align-center text-center justify-center fill-height">

            <v-dialog v-model="modalState.showModal">
                <div class="d-flex align-center justify-center">
                    <v-card width="30em">
                        <v-card-text>
                            <v-form v-if="modalState.login">
                                <v-text-field label="username"></v-text-field>
                                <v-text-field label="password" type="password"></v-text-field>
                            </v-form>
                            <v-form v-if="modalState.signup">
                                <v-btn color="primary" @click="connectTwitch()">Connect Twitch</v-btn>
                                <v-list>
                                    <v-list-item v-for="(exchangeKey, index) in exchangeKeys">
                                        <v-text-field label="EXCHANGE"></v-text-field>
                                        <v-text-field label="API KEY"></v-text-field>
                                        <v-text-field label="API SECRET"></v-text-field>
                                    </v-list-item>
                                </v-list>
                            </v-form>
                        </v-card-text>
                        <v-card-actions class="d-flex align-center justify-center">
                            <v-btn color="primary" @click="login()" v-if="modalState.login">Login</v-btn>
                            <v-btn color="primary" @click="signup()" v-if="modalState.signup">Create</v-btn>
                            <v-btn color="error" @click="handleCloseDialog()">{{ 'Close' }}</v-btn>
                        </v-card-actions>
                    </v-card>
                </div>
            </v-dialog>
            <v-img contain height="300" src="src/assets/logo.svg" />

            <div class="text-body-2 font-weight-light mb-n1">Welcome to</div>

            <h1 class="text-h2 font-weight-bold">CyrptoPositionsBot</h1>

            <div class="py-14" />

            <v-row class="d-flex align-center justify-center">
                <v-col cols="auto">
                    <v-btn @click="modalState.showModal = true; modalState.login = true; modalState.signup = false;"
                        min-width="164" rel="noopener noreferrer" target="_blank" variant="text">
                        <v-icon icon="mdi-view-dashboard" size="large" start />

                        Login
                    </v-btn>
                </v-col>

                <v-col cols="auto">
                    <v-btn color="primary"
                        @click="modalState.showModal = true; modalState.login = false; modalState.signup = true;"
                        min-width="228" rel="noopener noreferrer" size="x-large" target="_blank" variant="flat">
                        <v-icon icon="mdi-speedometer" size="large" start />

                        Sign-Up
                    </v-btn>
                </v-col>

                <v-col cols="auto">
                    <v-btn min-width="164" rel="noopener noreferrer" target="_blank" variant="text">
                        <v-icon icon="mdi-account-group" size="large" start />

                        Discord
                    </v-btn>
                </v-col>
            </v-row>

            <v-row class="d-flex align-center justify-center">
                <v-col cols="auto">
                    <v-img width="200px" height="300px" src="https://picsum.photos/200/300"></v-img>
                </v-col>
            </v-row>
        </v-responsive>
    </v-container>
</template>