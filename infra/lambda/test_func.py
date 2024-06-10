import unittest
from unittest.mock import patch, MagicMock
from func import lambda_handler

class TestLambdaFunction(unittest.TestCase):

    @patch('func.table')
    def test_lambda_handler(self, mock_table):
        mock_table.get_item.return_value = {
            'Item': {
                'id': '1',
                'views': 1
            }
        }
        mock_table.put_item.return_value = {}

        event = {}
        context = {}
        result = lambda_handler(event, context)
        self.assertEqual(result, 2)
        mock_table.get_item.assert_called_once_with(Key={'id': '1'})
        mock_table.put_item.assert_called_once_with(Item={'id': '1', 'views': 2})

if __name__ == '__main__':
    unittest.main()
