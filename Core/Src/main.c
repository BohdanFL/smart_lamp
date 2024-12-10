/* USER CODE BEGIN Header */
/**
 ******************************************************************************
 * @file           : main.c
 * @brief          : Main program body
 ******************************************************************************
 * @attention
 *
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 *
 ******************************************************************************
 */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include <string.h>
#include <stdio.h>

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
#define SERVER_IP "192.168.0.6"
#define SSID "notlamp"
#define PASS "0996330969"
#define ADC_RESOLUTION 4096
#define VREF 3.3

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
ADC_HandleTypeDef hadc1;

UART_HandleTypeDef huart1;
UART_HandleTypeDef huart2;

/* USER CODE BEGIN PV */

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART1_UART_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_ADC1_Init(void);
/* USER CODE BEGIN PFP */

/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
// Глобальний буфер для прийому
char uartBuffer[1024];
volatile uint16_t uartIndex = 0;
volatile uint8_t uartReceivedFlag = 0;

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    if (huart->Instance == USART2) {
        // Додаємо символ до буфера
        HAL_UART_Receive_IT(&huart2, (uint8_t *)&uartBuffer[uartIndex], 1);
        if (uartBuffer[uartIndex] == '\n') { // Кінець рядка
            uartReceivedFlag = 1;
        } else if (uartIndex < sizeof(uartBuffer) - 1) {
            uartIndex++;
        }
    }
}


void receiveResponse() {
    uartIndex = 0; // Очистка індексу
    memset(uartBuffer, 0, sizeof(uartBuffer));
    uartReceivedFlag = 0;

    // Запускаємо UART у режимі переривання
    HAL_UART_Receive_IT(&huart2, (uint8_t *)&uartBuffer[uartIndex], 1);

    // Чекаємо, поки отримаємо відповідь
    uint32_t startTime = HAL_GetTick();
    while (!uartReceivedFlag && (HAL_GetTick() - startTime < 5000)) {
        // Чекаємо до 5 секунд
    }

    // Перевірка завершення
    if (uartReceivedFlag) {
        UART_Send_String("Received: ");
        UART_Send_String(uartBuffer); // Виводимо відповідь
    } else {
        UART_Send_String("Timeout waiting for response\n");
    }
}


void sendCommand(const char *cmd) {

    HAL_UART_Transmit(&huart2, (uint8_t *)cmd, strlen(cmd), HAL_MAX_DELAY);
    HAL_Delay(100);
}

void connectToWiFi() {
    char connectCmd[128];

    snprintf(connectCmd, sizeof(connectCmd), "AT+CWJAP=\"%s\",\"%s\"\r\n", SSID, PASS);
    sendCommand(connectCmd);
    HAL_Delay(5000);
}


void sendGETRequest() {
    char connectCmd[128];
    char getRequest[256];
    char responseBuffer[1024]; // Буфер для зчитування відповіді
    int responseIndex = 0;

    // Формуємо команду для підключення
    snprintf(connectCmd, sizeof(connectCmd), "AT+CIPSTART=\"TCP\",\"%s\",5000\r\n", SERVER_IP);
    sendCommand(connectCmd);
    HAL_Delay(1000);

    // Формуємо GET-запит
    snprintf(getRequest, sizeof(getRequest),
             "GET /jsonrequest HTTP/1.1\r\nHost: %s\r\n\r\n", SERVER_IP);

    // Надсилаємо AT-команду для початку передачі
    char cipSendCmd[32];
    snprintf(cipSendCmd, sizeof(cipSendCmd), "AT+CIPSEND=%d\r\n", strlen(getRequest));
    sendCommand(cipSendCmd);
    HAL_Delay(100);

    // Надсилаємо запит
    sendCommand(getRequest);

    //int a = 0;

    // Чекаємо і зчитуємо відповідь
    uint32_t startTime = HAL_GetTick(); // Запам'ятовуємо час початку зчитування
    while ((HAL_GetTick() - startTime) < 3000) { // Чекаємо до 2 секунд
        uint8_t byte;
        if (HAL_UART_Receive(&huart2, &byte, 1, 100) == HAL_OK) {
//        	a++;
            responseBuffer[responseIndex++] = byte;
            if (responseIndex >= sizeof(responseBuffer) - 1) break; // Захист від переповнення буфера
            startTime = HAL_GetTick(); // Оновлюємо час при отриманні байта
        }
    }
    //sprintf(responseBuffer, "%d", a);
    responseBuffer[responseIndex] = '\0'; // Завершення рядка

    // Виводимо відповідь у UART1 для діагностики
    UART_Send_String("Response from server:\n");
    UART_Send_String(responseBuffer);

}



void sendPostRequest(const char *value) {
    char connectCmd[128];
    char postRequest[256];
    char body[128];
    int contentLength;

    // Формуємо тіло запиту
    snprintf(body, sizeof(body), "obtained=%s", value);
    contentLength = strlen(body);

    // Формуємо повний HTTP-запит
    snprintf(postRequest, sizeof(postRequest),
             "POST /lamps/1/schedules HTTP/1.1\r\n"
             "Host: %s\r\n"
             "Content-Type: text/plain\r\n"
             "Content-Length: %d\r\n\r\n"
             "%s",
             SERVER_IP, contentLength, body);

    // Формуємо команду для підключення
    snprintf(connectCmd, sizeof(connectCmd), "AT+CIPSTART=\"TCP\",\"%s\",5000\r\n", SERVER_IP);
    sendCommand(connectCmd);
    HAL_Delay(1000);

    // Надсилаємо AT-команду для початку передачі
    char cipSendCmd[32];
    snprintf(cipSendCmd, sizeof(cipSendCmd), "AT+CIPSEND=%d\r\n", strlen(postRequest));
    sendCommand(cipSendCmd);
    HAL_Delay(100);

    // Надсилаємо запит
    sendCommand(postRequest);
}

float Read_ADC_To_Volts(ADC_HandleTypeDef* hadc) {
    //char voltageString[20]; // Буфер для збереження рядка
    uint32_t adcValue;
    float voltage;

    // Запускаємо ADC
    HAL_ADC_Start(hadc);

    // Чекаємо завершення конверсії
    if (HAL_ADC_PollForConversion(hadc, HAL_MAX_DELAY) == HAL_OK) {
        // Отримуємо значення ADC
        adcValue = HAL_ADC_GetValue(hadc);

        // Перетворюємо значення ADC у вольти
        voltage = (adcValue * VREF) / ADC_RESOLUTION;

        // Форматуємо результат у рядок
        //snprintf(voltageString, sizeof(voltageString), "%.2f V", voltage);
    }

    // Зупиняємо ADC
    HAL_ADC_Stop(hadc);

    return voltage;
}

// Функція для надсилання повідомлення через UART
void UART_Send_String(char *str) {
    HAL_UART_Transmit(&huart1, (uint8_t *)str, strlen(str), HAL_MAX_DELAY);
}
/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART1_UART_Init();
  MX_USART2_UART_Init();
  MX_ADC1_Init();
  /* USER CODE BEGIN 2 */

  UART_Send_String("Connecting to Wi-Fi\n");
  connectToWiFi();
  //receiveResponse();
  UART_Send_String("Sending GET request\n");
  sendGETRequest();
  //receiveResponse();
  UART_Send_String("Sending POST request\n");
  sendPostRequest("Amogus");
  //receiveResponse();
  float voltage;

  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */
	  voltage = Read_ADC_To_Volts(&hadc1);
	  (voltage >= 2.75f) ? HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_RESET) : HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_SET);

	  sendGETRequest();
    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};
  RCC_PeriphCLKInitTypeDef PeriphClkInit = {0};

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_NONE;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_HSI;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV1;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_0) != HAL_OK)
  {
    Error_Handler();
  }
  PeriphClkInit.PeriphClockSelection = RCC_PERIPHCLK_ADC;
  PeriphClkInit.AdcClockSelection = RCC_ADCPCLK2_DIV2;
  if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInit) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief ADC1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_ADC1_Init(void)
{

  /* USER CODE BEGIN ADC1_Init 0 */

  /* USER CODE END ADC1_Init 0 */

  ADC_ChannelConfTypeDef sConfig = {0};

  /* USER CODE BEGIN ADC1_Init 1 */

  /* USER CODE END ADC1_Init 1 */

  /** Common config
  */
  hadc1.Instance = ADC1;
  hadc1.Init.ScanConvMode = ADC_SCAN_DISABLE;
  hadc1.Init.ContinuousConvMode = DISABLE;
  hadc1.Init.DiscontinuousConvMode = DISABLE;
  hadc1.Init.ExternalTrigConv = ADC_SOFTWARE_START;
  hadc1.Init.DataAlign = ADC_DATAALIGN_RIGHT;
  hadc1.Init.NbrOfConversion = 1;
  if (HAL_ADC_Init(&hadc1) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure Regular Channel
  */
  sConfig.Channel = ADC_CHANNEL_7;
  sConfig.Rank = ADC_REGULAR_RANK_1;
  sConfig.SamplingTime = ADC_SAMPLETIME_1CYCLE_5;
  if (HAL_ADC_ConfigChannel(&hadc1, &sConfig) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN ADC1_Init 2 */

  /* USER CODE END ADC1_Init 2 */

}

/**
  * @brief USART1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART1_UART_Init(void)
{

  /* USER CODE BEGIN USART1_Init 0 */

  /* USER CODE END USART1_Init 0 */

  /* USER CODE BEGIN USART1_Init 1 */

  /* USER CODE END USART1_Init 1 */
  huart1.Instance = USART1;
  huart1.Init.BaudRate = 115200;
  huart1.Init.WordLength = UART_WORDLENGTH_8B;
  huart1.Init.StopBits = UART_STOPBITS_1;
  huart1.Init.Parity = UART_PARITY_NONE;
  huart1.Init.Mode = UART_MODE_TX_RX;
  huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart1.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART1_Init 2 */

  /* USER CODE END USART1_Init 2 */

}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
/* USER CODE BEGIN MX_GPIO_Init_1 */
/* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_RESET);

  /*Configure GPIO pin : PB10 */
  GPIO_InitStruct.Pin = GPIO_PIN_10;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

/* USER CODE BEGIN MX_GPIO_Init_2 */
/* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
