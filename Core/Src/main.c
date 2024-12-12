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
#include "cmsis_os.h"
#include <stdio.h>
#include <string.h>
#include "cJSON.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
#define SERVER_IP "192.168.0.106"
#define SSID "TP-Link_82F6"
#define PASS "48067706"
#define ADC_RESOLUTION 4096
#define VREF 3.3

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
ADC_HandleTypeDef hadc1;

TIM_HandleTypeDef htim2;

UART_HandleTypeDef huart1;
UART_HandleTypeDef huart2;

osThreadId defaultTaskHandle;
osThreadId UARTTaskHandle;
/* USER CODE BEGIN PV */

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART1_UART_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_ADC1_Init(void);
static void MX_TIM2_Init(void);
void StartDefaultTask(void const * argument);
void StartUARTTask(void const * argument);

/* USER CODE BEGIN PFP */
char rxBuffer[2000];
char connectCmd[100];
char tempBuff[200];
char jsonBuff[500];
uint8_t ATisOK;

volatile int _power_state = 0;
volatile int _previous_brightness = -1;
volatile int _brightness = 0;
volatile int _mode = 0;

/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
// Глобальний буфер для прийому
char uartBuffer[1024];
volatile uint16_t uartIndex = 0;
volatile uint8_t uartReceivedFlag = 0;

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


    // Формуємо команду для підключення
    snprintf(connectCmd, sizeof(connectCmd), "AT+CIPSTART=\"TCP\",\"%s\",5000\r\n", SERVER_IP);
    HAL_UART_Transmit(&huart2, (uint8_t *)connectCmd, strlen(connectCmd), HAL_MAX_DELAY);

    // Формуємо GET-запит
    snprintf(connectCmd, sizeof(connectCmd),
             "GET /jsonrequest HTTP/1.1\r\nHost: %s\r\n\r\n", SERVER_IP);

    // Надсилаємо AT-команду для початку передачі
    snprintf(tempBuff, sizeof(tempBuff), "AT+CIPSEND=%d\r\n", strlen(connectCmd));
    HAL_UART_Transmit(&huart2, (uint8_t *)tempBuff, strlen(tempBuff), HAL_MAX_DELAY);
    HAL_Delay(100);

    // Надсилаємо запит
    HAL_UART_Transmit(&huart2, (uint8_t *)connectCmd, strlen(connectCmd), HAL_MAX_DELAY);
	HAL_UART_Receive(&huart2, rxBuffer, 2000, 300);




	memset(jsonBuff, 0, sizeof(jsonBuff));

    int start = 0;
    int jsonIndex = 0;
    for(int i = 0; i < 2000; i++) {
    	if(rxBuffer[i] == '{') start = 1;
    	if(start) {
    		jsonBuff[jsonIndex] = rxBuffer[i];
    	    //HAL_UART_Transmit(&huart1, (uint8_t *)jsonBuff[jsonIndex], 1, HAL_MAX_DELAY);
    	    jsonIndex++;
    	}
    	if(rxBuffer[i] == '}') break;
    }

    UART_Send_String("Response from server:\r\n");
    UART_Send_String(jsonBuff);


    cJSON *json = cJSON_Parse(jsonBuff);
       if (json == NULL) {
           const char *error_ptr = cJSON_GetErrorPtr();
           if (error_ptr != NULL) {
           }
           cJSON_Delete(json);
       }

       // access the JSON data

       cJSON *mode = cJSON_GetObjectItemCaseSensitive(json, "mode");
       _mode = mode->valueint;

       cJSON *power_state = cJSON_GetObjectItemCaseSensitive(json, "power_state");
       _power_state = power_state->valueint;

       cJSON *brightness = cJSON_GetObjectItemCaseSensitive(json, "brightness");
       _previous_brightness = _brightness;
       _brightness = brightness->valueint;

       // delete the JSON object
       cJSON_Delete(json);
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
  MX_TIM2_Init();
  /* USER CODE BEGIN 2 */

//  UART_Send_String("Connecting to Wi-Fi\n");
//  connectToWiFi();
//  //receiveResponse();
//  UART_Send_String("Sending GET request\n");
//  sendGETRequest();
//  //receiveResponse();
//  UART_Send_String("Sending POST request\n");
//  sendPostRequest("Amogus");
  //receiveResponse();

  /* USER CODE END 2 */

  /* USER CODE BEGIN RTOS_MUTEX */
  /* add mutexes, ... */
  /* USER CODE END RTOS_MUTEX */

  /* USER CODE BEGIN RTOS_SEMAPHORES */
  /* add semaphores, ... */
  /* USER CODE END RTOS_SEMAPHORES */

  /* USER CODE BEGIN RTOS_TIMERS */
  /* start timers, add new ones, ... */
  /* USER CODE END RTOS_TIMERS */

  /* USER CODE BEGIN RTOS_QUEUES */
  /* add queues, ... */
  /* USER CODE END RTOS_QUEUES */

  /* Create the thread(s) */
  /* definition and creation of defaultTask */
  osThreadDef(defaultTask, StartDefaultTask, osPriorityNormal, 0, 128);
  defaultTaskHandle = osThreadCreate(osThread(defaultTask), NULL);

  /* definition and creation of UARTTask */
  osThreadDef(UARTTask, StartUARTTask, osPriorityNormal, 0, 128);
  UARTTaskHandle = osThreadCreate(osThread(UARTTask), NULL);

  /* USER CODE BEGIN RTOS_THREADS */
  /* add threads, ... */
  /* USER CODE END RTOS_THREADS */

  /* Start scheduler */
  osKernelStart();

  /* We should never get here as control is now taken by the scheduler */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

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
  * @brief TIM2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM2_Init(void)
{

  /* USER CODE BEGIN TIM2_Init 0 */

  /* USER CODE END TIM2_Init 0 */

  TIM_ClockConfigTypeDef sClockSourceConfig = {0};
  TIM_MasterConfigTypeDef sMasterConfig = {0};
  TIM_OC_InitTypeDef sConfigOC = {0};

  /* USER CODE BEGIN TIM2_Init 1 */

  /* USER CODE END TIM2_Init 1 */
  htim2.Instance = TIM2;
  htim2.Init.Prescaler = 127;
  htim2.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim2.Init.Period = 625;
  htim2.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  if (HAL_TIM_Base_Init(&htim2) != HAL_OK)
  {
    Error_Handler();
  }
  sClockSourceConfig.ClockSource = TIM_CLOCKSOURCE_INTERNAL;
  if (HAL_TIM_ConfigClockSource(&htim2, &sClockSourceConfig) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_TIM_PWM_Init(&htim2) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim2, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sConfigOC.OCMode = TIM_OCMODE_PWM1;
  sConfigOC.Pulse = 0;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  if (HAL_TIM_PWM_ConfigChannel(&htim2, &sConfigOC, TIM_CHANNEL_2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM2_Init 2 */

  /* USER CODE END TIM2_Init 2 */
  HAL_TIM_MspPostInit(&htim2);

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

/* USER CODE BEGIN Header_StartDefaultTask */
/**
  * @brief  Function implementing the defaultTask thread.
  * @param  argument: Not used
  * @retval None
  */
/* USER CODE END Header_StartDefaultTask */
void StartDefaultTask(void const * argument)
{
  /* USER CODE BEGIN 5 */
	float voltage = 0;
	HAL_TIM_PWM_Start(&htim2, TIM_CHANNEL_2);
  /* Infinite loop */
  for(;;)
  {

	  if(_mode == 1) {

		  voltage = Read_ADC_To_Volts(&hadc1);
		  (voltage >= 2.75f) ? HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_RESET) : HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_SET);
		  osDelay(100);
	  } else if(_mode == 0) {
		  if(_power_state) {
//			  if(_brightness != _previous_brightness) {
////				  int inc = 0;
////				  _brightness > _previous_brightness ? (inc = 1) : (inc = -1);
////
////				  for(int i = _previous_brightness; i != _brightness; i + inc) {
////					  __HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_2, i * 6);
////					  osDelay(50);
////				  }
//
//				  if(_brightness > _previous_brightness) {
//					  for(int i = _previous_brightness; i <= _brightness; i++) {
//						  __HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_2, i * 6);
//						  osDelay(50);
//					  }
//				  } else {
//					  for(int i = _previous_brightness; i >= _brightness; i--) {
//					  	__HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_2, i * 6);
//					  	osDelay(50);
//				}
//				  }
//
//				   _previous_brightness = _brightness;
//			  } else {
				  __HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_2, _brightness * 6);
			  //}
		  } else {
			  __HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_2, 0);
		  }
	  }
	  osDelay(100);
  }
  /* USER CODE END 5 */
}

/* USER CODE BEGIN Header_StartUARTTask */
/**
* @brief Function implementing the UARTTask thread.
* @param argument: Not used
* @retval None
*/
/* USER CODE END Header_StartUARTTask */
void StartUARTTask(void const * argument)
{
  /* USER CODE BEGIN StartUARTTask */
	int attempt = 1;

	UART_Send_String("Connecting to Wi-Fi\r\n");
	snprintf(tempBuff, sizeof(tempBuff), "SSID: %s\r\nPassword: %s\r\n", SSID, PASS);
	UART_Send_String(tempBuff);

	snprintf(connectCmd, sizeof(connectCmd), "AT+CWJAP=\"%s\",\"%s\"\r\n", SSID, PASS);

	ATisOK = 0;
	while(!ATisOK) {
		snprintf(tempBuff, sizeof(tempBuff), "Attempt number: %d\r\n", attempt);
		UART_Send_String(tempBuff);
		memset(rxBuffer, 0, sizeof(rxBuffer));
		HAL_UART_Transmit(&huart2, (uint8_t *)connectCmd, strlen(connectCmd), 1000);
		HAL_UART_Receive(&huart2, rxBuffer, 2000, 2000);

		if(strstr((char *)rxBuffer,"OK")){
		      ATisOK = 1;
		}

		osDelay(500);
		attempt++;
	}

	UART_Send_String("Connecting to Wi-Fi is successful!\r\n");


  /* Infinite loop */
  for(;;)
  {
	  sendGETRequest();
    osDelay(100);
  }
  /* USER CODE END StartUARTTask */
}

/**
  * @brief  Period elapsed callback in non blocking mode
  * @note   This function is called  when TIM1 interrupt took place, inside
  * HAL_TIM_IRQHandler(). It makes a direct call to HAL_IncTick() to increment
  * a global variable "uwTick" used as application time base.
  * @param  htim : TIM handle
  * @retval None
  */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  /* USER CODE BEGIN Callback 0 */

  /* USER CODE END Callback 0 */
  if (htim->Instance == TIM1) {
    HAL_IncTick();
  }
  /* USER CODE BEGIN Callback 1 */

  /* USER CODE END Callback 1 */
}

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
